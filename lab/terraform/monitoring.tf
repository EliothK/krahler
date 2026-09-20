# Everything here lives in rg-portfolio and goes away with the lab.
# The subscription budget was moved to the site root (terraform/budget.tf) so cost alerts survive a lab teardown.
resource "azurerm_log_analytics_workspace" "portfolio" {
  name                = "log-${var.project}"
  resource_group_name = azurerm_resource_group.portfolio.name
  location            = azurerm_resource_group.portfolio.location
  sku                 = "PerGB2018"
  retention_in_days   = 30 # the cost dial. Default is longer.
  tags                = var.tags
}

resource "azurerm_application_insights" "portfolio" {
  name                = "appi-${var.project}"
  resource_group_name = azurerm_resource_group.portfolio.name
  location            = azurerm_resource_group.portfolio.location
  application_type    = "web"
  workspace_id        = azurerm_log_analytics_workspace.portfolio.id
  tags                = var.tags
}

# Where alerts go. Verify it works before trusting it.
resource "azurerm_monitor_action_group" "portfolio" {
  name                = "ag-${var.project}"
  resource_group_name = azurerm_resource_group.portfolio.name
  short_name          = "portfolio" # 12 characters maximum

  email_receiver {
    name          = "elioth"
    email_address = var.alert_email
  }
}

resource "azurerm_application_insights_standard_web_test" "portfolio" {
  name                    = "avail-${var.project}"
  resource_group_name     = azurerm_resource_group.portfolio.name
  location                = azurerm_resource_group.portfolio.location
  application_insights_id = azurerm_application_insights.portfolio.id
  geo_locations           = ["us-il-ch1-azr", "us-va-ash-azr"]
  frequency               = 900
  timeout                 = 30
  enabled                 = true

  request {
    url = "https://krahler.com"
  }

  validation_rules {
    expected_status_code        = 200
    ssl_check_enabled           = true
    ssl_cert_remaining_lifetime = 7
  }
}

resource "azurerm_monitor_metric_alert" "availability" {
  name                = "alert-${var.project}-availability"
  resource_group_name = azurerm_resource_group.portfolio.name
  scopes = [
    azurerm_application_insights_standard_web_test.portfolio.id,
    azurerm_application_insights.portfolio.id,
  ]
  severity    = 1
  frequency   = "PT1M"
  window_size = "PT15M"
  description = "krahler.com is failing its availability test."

  application_insights_web_test_location_availability_criteria {
    web_test_id           = azurerm_application_insights_standard_web_test.portfolio.id
    component_id          = azurerm_application_insights.portfolio.id
    failed_location_count = 2
  }

  action {
    action_group_id = azurerm_monitor_action_group.portfolio.id
  }
}

# The oms_agent block on the AKS cluster wires up the workspace, but MSI-auth ingestion needs its own Data Collection Rule + association - the Portal's "Enable" button creates these for you silently; Terraform does not.
# Without this, ama-logs runs but every write fails with "No JSON file found in the specified directory. Check if mdsd is running in MSI mode" and no Kubernetes tables (KubePodInventory, ContainerLogV2, ...) ever appear.
resource "azurerm_monitor_data_collection_rule" "container_insights" {
  name                = "MSCI-${azurerm_kubernetes_cluster.portfolio.name}"
  resource_group_name = azurerm_resource_group.portfolio.name
  location            = azurerm_resource_group.portfolio.location
  kind                = "Linux"
  tags                = var.tags

  destinations {
    log_analytics {
      workspace_resource_id = azurerm_log_analytics_workspace.portfolio.id
      name                  = "ciworkspace"
    }
  }

  data_flow {
    streams      = ["Microsoft-ContainerInsights-Group-Default"]
    destinations = ["ciworkspace"]
  }

  data_sources {
    extension {
      streams        = ["Microsoft-ContainerInsights-Group-Default"]
      extension_name = "ContainerInsights"
      name           = "ContainerInsightsExtension"
      extension_json = jsonencode({
        dataCollectionSettings = {
          interval               = "1m"
          namespaceFilteringMode = "Off"
        }
      })
    }
  }
}

resource "azurerm_monitor_data_collection_rule_association" "container_insights" {
  name                    = "ContainerInsightsExtension"
  target_resource_id      = azurerm_kubernetes_cluster.portfolio.id
  data_collection_rule_id = azurerm_monitor_data_collection_rule.container_insights.id
}
