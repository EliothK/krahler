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
  location            = azurerm_resource_group.web.location # Free tier is only offered in a few regions; centralus is one
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = var.tags

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
