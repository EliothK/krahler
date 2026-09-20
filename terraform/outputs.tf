output "resource_group_name" {
  value = azurerm_resource_group.portfolio.name
}

output "acr_login_server" {
  value       = azurerm_container_registry.portfolio.login_server
  description = "Use this as the image prefix: <login_server>/portfolio:<sha>"
}

output "aks_cluster_name" {
  value = azurerm_kubernetes_cluster.portfolio.name
}

output "static_web_app_name" {
  value       = azurerm_static_web_app.portfolio.name
  description = "Name of the Static Web App. The deploy workflow uses it to fetch the deployment token at run time."
}

output "static_web_app_resource_group" {
  value = azurerm_resource_group.web.name
}

output "static_web_app_default_hostname" {
  value       = azurerm_static_web_app.portfolio.default_host_name
  description = "Verify the site here (*.azurestaticapps.net) before pointing krahler.com's DNS at it."
}
