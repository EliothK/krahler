# Production infrastructure for krahler.com: the Static Web App, its domains, the deploy role and the cost budget.
# The AKS lab lives in ../lab/terraform with its own state, so a lab apply or destroy can never touch the public site.
terraform {
  required_version = ">= 1.9"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 5.5.0"
    }
  }

  # Separate state from the lab. Pass the key at init time, e.g. -backend-config=backend.hcl (see backend.hcl.example): key = "site.tfstate".
  backend "azurerm" {
    use_azuread_auth = true
  }
}

provider "azurerm" {
  features {}

  resource_provider_registrations = "none"
  resource_providers_to_register = [
    "Microsoft.Web", # Static Web Apps
  ]
}
