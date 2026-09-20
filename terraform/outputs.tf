output "static_web_app_name" {
  value       = azurerm_static_web_app.portfolio.name
  description = "Name of the Static Web App. The deploy workflow uses it to fetch the deployment token at run time."
}

output "static_web_app_resource_group" {
  value = azurerm_resource_group.web.name
}

output "static_web_app_default_hostname" {
  value       = azurerm_static_web_app.portfolio.default_host_name
  description = "Target for the CNAME records in Cloudflare, and where to check the site before DNS moves."
}

output "apex_validation_token" {
  value       = azurerm_static_web_app_custom_domain.apex.validation_token
  sensitive   = true # the provider marks it sensitive; read it with `terraform output -raw apex_validation_token`
  description = "Put this in a TXT record at the apex in Cloudflare. Empty once the domain has validated."
}
