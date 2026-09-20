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
