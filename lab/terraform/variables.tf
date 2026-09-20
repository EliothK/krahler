variable "project" {
  description = "Short name used to build resource names."
  type        = string
  default     = "portfolio"
}

variable "location" {
  description = "Azure region. Keep everthing in one - cross-region egress costs money."
  type        = string
  default     = "centralus"
}

variable "acr_name" {
  description = "Globally unique. Alphanumberic only, 5-50 chars - no hyphens."
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9]{5,50}$", var.acr_name))
    error_message = "ACR names are alphanumeric only, 5-50 characters. No hyphens."
  }
}


variable "acme_email" {
  description = "Contact email registered with Let's Encrypt for certificate expiry notices."
  type        = string
}

variable "alert_email" {
  description = "Email address for the lab's monitoring alerts."
  type        = string
}

variable "tags" {
  description = "Applied to everything, so the cost view is readable"
  type        = map(string)
  default = {
    project   = "portfolio"
    managedBy = "terraform"
  }
}
