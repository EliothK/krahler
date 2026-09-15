terraform {
  required_version = ">= 1.9"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.3.0"
    }
  }

  backend "azurerm" {
    use_azuread_auth = true
  }
}

provider "azurerm" {
  features {}

  resource_provider_registrations = "none"
  resource_providers_to_register = [
    "Microsoft.ContainerRegistry",
    "Microsoft.ContainerService",    # AKS
    "Microsoft.OperationalInsights", # Log Analytics
  ]
}

resource "azurerm_resource_group" "portfolio" {
  name     = "rg-${var.project}"
  location = var.location
  tags     = var.tags
}

resource "azurerm_container_registry" "portfolio" {
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.portfolio.name
  location            = azurerm_resource_group.portfolio.location
  sku                 = "Basic"
  admin_enabled       = false
  tags                = var.tags
}

resource "azurerm_public_ip" "gateway" {
  name                = "pip-${var.project}-gateway"
  resource_group_name = "rg-tfstate" # deliberately NOT rg-portfolio
  location            = var.location
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = var.tags

  lifecycle {
    prevent_destroy = true # survives destroy
  }
}

output "gateway_ip" {
  value = azurerm_public_ip.gateway.ip_address
}

resource "azurerm_role_assignment" "aks_pip" {
  scope                = azurerm_public_ip.gateway.id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_kubernetes_cluster.portfolio.identity[0].principal_id
}

resource "azurerm_kubernetes_cluster" "portfolio" {
  name                = "aks-${var.project}"
  resource_group_name = azurerm_resource_group.portfolio.name
  location            = azurerm_resource_group.portfolio.location
  dns_prefix          = "aks-${var.project}"
  sku_tier            = "Free"
  tags                = var.tags

  default_node_pool {
    name       = "default"
    node_count = 1
    vm_size    = "Standard_B2s_v2"
  }

  identity {
    type = "SystemAssigned"
  }

  node_provisioning_profile {
    mode = "Manual"
  }
}

resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                            = azurerm_container_registry.portfolio.id
  role_definition_name             = "AcrPull"
  principal_id                     = azurerm_kubernetes_cluster.portfolio.kubelet_identity[0].object_id
  skip_service_principal_aad_check = true
}