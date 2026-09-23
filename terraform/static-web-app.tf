# Production host for krahler.com after the move off AKS. Free tier: no cost, custom domain and managed TLS included.
#
# Deliberately in its OWN resource group, not rg-portfolio.
# rg-portfolio holds the AKS lab, which is meant to be applied and destroyed on demand; the public site must survive that.
# Same approach as the gateway public IP above (also outside rg-portfolio, prevent_destroy).
resource "azurerm_resource_group" "web" {
  name     = "rg-${var.project}-web"
  location = var.location
  tags     = var.tags

  lifecycle {
    prevent_destroy = true # survives destroy of the AKS lab
  }
}

resource "azurerm_static_web_app" "portfolio" {
  name                = "swa-${var.project}"
  resource_group_name = azurerm_resource_group.web.name
  location            = azurerm_resource_group.web.location # Static Web Apps is only offered in a few regions; centralus is one
  # Standard, upgraded by hand in the portal and matched here so an apply doesn't downgrade it. Free allows 3 preview environments; Standard allows 10 (the `staging` one used by deploy.yml is one).
  sku_tier = "Standard"
  sku_size = "Standard"
  tags     = var.tags

  lifecycle {
    prevent_destroy = true
  }
}

# Lets the deploy-swa workflow run `az staticwebapp secrets list`. Scoped to the web resource group only, mirroring the Contributor on rg-portfolio the pipeline already has.
resource "azurerm_role_assignment" "deploy_swa" {
  scope                = azurerm_resource_group.web.id
  role_definition_name = "Contributor"
  principal_id         = var.deploy_principal_id
}

# Custom domains. The two validation types behave differently, which fixes the order of operations at cutover:
#
# - Apex (krahler.com) must use dns-txt-token. Terraform returns right away with a token and does NOT wait for validation; Azure validates asynchronously once the TXT record exists.
#   So this can be applied and fully validated (certificate included) BEFORE any traffic moves.
#   The token exists only until the domain is validated, then it is cleared.
# - www uses cname-delegation. Terraform polls until the CNAME already points at the Static Web App and blocks (30 min timeout) if it does not.
#   So apply this only AFTER the CNAME exists in Cloudflare, i.e. at cutover, with a targeted apply.
#
# Both records must be DNS-only (grey cloud) in Cloudflare; a proxied record breaks validation.
#
# ignore_changes on validation_type: the Azure API does not return it, so after an import (or a state move between roots) it reads as unset and Terraform plans to REPLACE the domain, which would drop the live certificate.
# It cannot be changed in place anyway (any change means recreation), so ignoring it loses nothing.
resource "azurerm_static_web_app_custom_domain" "apex" {
  static_web_app_id = azurerm_static_web_app.portfolio.id
  domain_name       = var.domain
  validation_type   = "dns-txt-token"

  lifecycle {
    ignore_changes = [validation_type]
  }
}

resource "azurerm_static_web_app_custom_domain" "www" {
  static_web_app_id = azurerm_static_web_app.portfolio.id
  domain_name       = "www.${var.domain}"
  validation_type   = "cname-delegation"

  lifecycle {
    ignore_changes = [validation_type]
  }
}
