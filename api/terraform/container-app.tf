# The API runs as a Container App on the Consumption plan. With min_replicas = 0 nothing runs, and nothing is billed, while nobody is calling it; the first request after idle pays a JVM cold start of a few seconds.
# The monthly free grant of vCPU and memory seconds covers a portfolio's traffic.
resource "azurerm_resource_group" "api" {
  name     = "rg-${var.project}-api"
  location = var.location
  tags     = var.tags
}

# Logs for debugging. The daily cap is a cost guard: a runaway log loop stops at 100 MB a day instead of running up a bill.
resource "azurerm_log_analytics_workspace" "api" {
  name                = "log-${var.project}-api"
  resource_group_name = azurerm_resource_group.api.name
  location            = azurerm_resource_group.api.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  daily_quota_gb      = 0.1
  tags                = var.tags
}

resource "azurerm_container_app_environment" "api" {
  name                       = "cae-${var.project}-api"
  resource_group_name        = azurerm_resource_group.api.name
  location                   = azurerm_resource_group.api.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.api.id
  tags                       = var.tags
}

resource "azurerm_container_app" "api" {
  name                         = "ca-${var.project}-api"
  resource_group_name          = azurerm_resource_group.api.name
  container_app_environment_id = azurerm_container_app_environment.api.id
  revision_mode                = "Single"
  tags                         = var.tags

  template {
    min_replicas = 0
    max_replicas = 1 # one is plenty, and a hard ceiling on cost if something floods it

    container {
      name   = "api"
      image  = var.image
      cpu    = 0.25
      memory = "0.5Gi"

      env {
        name  = "API_ALLOWED_ORIGINS"
        value = var.allowed_origins
      }

      liveness_probe {
        transport = "HTTP"
        port      = 8080
        path      = "/actuator/health/liveness"
      }

      readiness_probe {
        transport = "HTTP"
        port      = 8080
        path      = "/actuator/health/readiness"
      }
    }
  }

  ingress {
    external_enabled = true
    target_port      = 8080

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  lifecycle {
    # The pipeline rolls out new images (and sets API_VERSION) with `az containerapp update`. Without this, every plan would try to put the bootstrap image back.
    ignore_changes = [
      template[0].container[0].image,
      template[0].container[0].env,
    ]
  }
}

# Lets the pipeline run `az containerapp update`. Scoped to the API resource group only.
resource "azurerm_role_assignment" "deploy_api" {
  scope                = azurerm_resource_group.api.id
  role_definition_name = "Contributor"
  principal_id         = var.deploy_principal_id
}

# Custom domain, in two steps because Azure validates against live DNS:
#   1. apply with enable_custom_domain = false, then add the two Cloudflare records shown in the outputs (DNS only, not proxied);
#   2. apply with enable_custom_domain = true, which issues a free managed certificate and binds it.
resource "azurerm_container_app_environment_managed_certificate" "api" {
  count = var.enable_custom_domain ? 1 : 0

  name                         = "cert-${replace(var.domain, ".", "-")}"
  container_app_environment_id = azurerm_container_app_environment.api.id
  subject_name                 = var.domain
  domain_control_validation    = "CNAME"
  tags                         = var.tags
}

resource "azurerm_container_app_custom_domain" "api" {
  count = var.enable_custom_domain ? 1 : 0

  name                                     = var.domain
  container_app_id                         = azurerm_container_app.api.id
  container_app_environment_certificate_id = azurerm_container_app_environment_managed_certificate.api[0].id
  certificate_binding_type                 = "SniEnabled"
}
