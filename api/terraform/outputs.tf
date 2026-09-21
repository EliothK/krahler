output "container_app_name" {
  value = azurerm_container_app.api.name
}

output "resource_group" {
  value = azurerm_resource_group.api.name
}

output "default_fqdn" {
  description = "Azure's own hostname for the app. The api CNAME record points here."
  value       = azurerm_container_app.api.ingress[0].fqdn
}

output "dns_records" {
  description = "Records to add in Cloudflare (DNS only, not proxied) before enabling the custom domain."
  value = {
    cname = "api -> ${azurerm_container_app.api.ingress[0].fqdn}"
    txt   = "asuid.api -> ${azurerm_container_app_environment.api.custom_domain_verification_id}"
  }
}
