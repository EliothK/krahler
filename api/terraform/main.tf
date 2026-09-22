# Infrastructure for the Spring Boot API behind api.krahler.com: a Container App that scales to zero, in its own resource group.
# Separate root and state from the site (../../terraform) and the AKS lab (../../lab/terraform), so applying or destroying one never touches the others.
terraform {
  required_version = ">= 1.9"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Pass the key at init time, e.g. -backend-config=backend.hcl (see backend.hcl.example): key = "api.tfstate".
  backend "azurerm" {
    use_azuread_auth = true
  }
}

provider "azurerm" {
  features {}

  resource_provider_registrations = "none"
  resource_providers_to_register = [
    "Microsoft.App",                 # Container Apps
    "Microsoft.OperationalInsights", # Log Analytics
    "Microsoft.Sql",                 # Azure SQL
  ]
}
