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
  logs_destination           = "log-analytics"
  log_analytics_workspace_id = azurerm_log_analytics_workspace.api.id
  tags                       = var.tags

  lifecycle {
    # Azure adds a "Consumption" workload profile on its own. It's what this environment runs on, so don't let Terraform try to remove it.
    ignore_changes = [workload_profile]
  }
}

resource "azurerm_container_app" "api" {
  name                         = "ca-${var.project}-api"
  resource_group_name          = azurerm_resource_group.api.name
  container_app_environment_id = azurerm_container_app_environment.api.id
  revision_mode                = "Single"
  tags                         = var.tags

  # Signs in to Azure SQL as itself (database user [ca-portfolio-api]), so there is no database password to store.
  identity {
    type = "SystemAssigned"
  }

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
      workload_profile_name, # Azure fills in "Consumption" on its own
      template[0].container[0].image,
      template[0].container[0].env,
      secret, # the mail credentials are set by `az containerapp secret set` in the deploy job, not declared here
    ]
  }
}

# Lets the pipeline run `az containerapp update`. Scoped to the API resource group only.
resource "azurerm_role_assignment" "deploy_api" {
  scope                = azurerm_resource_group.api.id
  role_definition_name = "Contributor"
  principal_id         = var.deploy_principal_id
}

# Custom domain. Azure validates against live DNS, so the two Cloudflare records in the outputs (CNAME api, TXT asuid.api, DNS only) must exist first.
# It also needs the hostname on the app BEFORE it will issue a certificate, while binding the certificate needs the certificate to exist.
# One Terraform resource can't express that order without a dependency cycle, so it's split:
#   1. the hostname is added here, unbound;
#   2. the free managed certificate is issued here, after the hostname exists;
#   3. the bind is one Azure CLI command, run once:
#        az containerapp hostname bind -g rg-portfolio-api -n ca-portfolio-api --hostname api.krahler.com --environment cae-portfolio-api --certificate cert-api-krahler-com
#      Terraform ignores the binding fields so it never tries to undo that.
resource "azurerm_container_app_custom_domain" "api" {
  count = var.enable_custom_domain ? 1 : 0

  name             = var.domain
  container_app_id = azurerm_container_app.api.id

  lifecycle {
    ignore_changes = [certificate_binding_type, container_app_environment_certificate_id]
  }
}

resource "azurerm_container_app_environment_managed_certificate" "api" {
  count = var.enable_custom_domain ? 1 : 0

  name                         = "cert-${replace(var.domain, ".", "-")}"
  container_app_environment_id = azurerm_container_app_environment.api.id
  subject_name                 = var.domain
  domain_control_validation    = "CNAME"
  tags                         = var.tags

  depends_on = [azurerm_container_app_custom_domain.api]
}
