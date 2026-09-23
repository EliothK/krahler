variable "project" {
  description = "Short name used to build resource names."
  type        = string
  default     = "portfolio"
}

variable "location" {
  description = "Azure region. Static Web Apps Free is only offered in a few; centralus is one."
  type        = string
  default     = "centralus"
}

variable "alert_email" {
  description = "Email address for budget notifications."
  type        = string
  sensitive   = true # plans are posted to public PRs and logs; keep the address out of them
}

variable "deploy_principal_id" {
  description = "Object ID of the GitHub Actions OIDC service principal. Gets Contributor on the Static Web App resource group so deploy-swa can read the deployment token."
  type        = string
}

variable "domain" {
  description = "Apex domain served by the Static Web App. www.<domain> is added as well."
  type        = string
  default     = "krahler.com"
}

variable "tags" {
  description = "Applied to everything, so the cost view is readable"
  type        = map(string)
  default = {
    project   = "portfolio"
    managedBy = "terraform"
  }
}
