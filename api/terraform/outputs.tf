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

output "sql_server_fqdn" {
  value = azurerm_mssql_server.api.fully_qualified_domain_name
}

output "sql_database_name" {
  value = azurerm_mssql_database.api.name
}

output "sql_admin_login" {
  value = azurerm_mssql_server.api.administrator_login
}

# Read once with `terraform output -raw sql_admin_password` and put into the DB_PASSWORD GitHub secret; Terraform itself never sends it anywhere.
output "sql_admin_password" {
  value     = random_password.sql_admin.result
  sensitive = true
}

output "dns_records" {
  description = "Records to add in Cloudflare (DNS only, not proxied) before enabling the custom domain."
  value = {
    cname = "api -> ${azurerm_container_app.api.ingress[0].fqdn}"
    txt   = "asuid.api -> ${azurerm_container_app_environment.api.custom_domain_verification_id}"
  }
}
