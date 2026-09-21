variable "project" {
  description = "Short name used to build resource names."
  type        = string
  default     = "portfolio"
}

variable "location" {
  description = "Azure region for the API."
  type        = string
  default     = "centralus"
}

variable "deploy_principal_id" {
  description = "Object ID of the GitHub Actions OIDC service principal. Gets Contributor on the API resource group so the pipeline can roll out a new image."
  type        = string
}

variable "image" {
  description = "Image the app is CREATED with. After that the pipeline rolls out new tags itself and Terraform ignores the image."
  type        = string
  default     = "ghcr.io/eliothk/krahler-api:latest"
}

variable "allowed_origins" {
  description = "Origins the browser may call the API from (CORS)."
  type        = string
  default     = "https://krahler.com,https://www.krahler.com"
}

variable "domain" {
  description = "Custom hostname for the API."
  type        = string
  default     = "api.krahler.com"
}

variable "enable_custom_domain" {
  description = "Turn on once the DNS records exist (see the outputs). Adding the domain before Cloudflare has the CNAME and TXT records makes Azure's validation fail."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Applied to everything, so the cost view is readable."
  type        = map(string)
  default = {
    project   = "portfolio"
    managedBy = "terraform"
  }
}
