# Where contact messages live so a message survives even when the email notification fails.
#
# Serverless General Purpose, not the free-offer flag: this provider version doesn't expose that toggle.
# Serverless auto-pauses after an hour of inactivity, so cost stays close to nothing between contact-form submissions.
# The generated admin credentials go to Terraform state and, once, to the GitHub secrets the deploy job reads — see outputs.tf.
resource "random_password" "sql_admin" {
  length  = 32
  special = true
  # SQL Server rejects some punctuation in passwords; keep it to characters it always accepts.
  override_special = "!#%&*+-="
}

resource "azurerm_mssql_server" "api" {
  name                         = "sql-${var.project}-api"
  resource_group_name          = azurerm_resource_group.api.name
  location                     = azurerm_resource_group.api.location
  version                      = "12.0"
  administrator_login          = "apiadmin"
  administrator_login_password = random_password.sql_admin.result
  minimum_tls_version          = "1.2"
  tags                         = var.tags
}

resource "azurerm_mssql_database" "api" {
  name         = "sqldb-${var.project}-contacts"
  server_id    = azurerm_mssql_server.api.id
  sku_name     = "GP_S_Gen5_1"
  min_capacity = 0.5
  max_size_gb  = 2
  # Minimum Azure allows for serverless. The database resumes automatically on the next connection; the app's own connection pool absorbs that latency, not a visitor waiting on a request.
  auto_pause_delay_in_minutes = 60
  storage_account_type        = "Local"
  tags                        = var.tags
}

# The Container App has no fixed outbound IP on the Consumption plan, so the alternative to this is a private endpoint + VNET integration — real infrastructure for a portfolio's contact form.
# "Allow Azure services" (the 0.0.0.0/0.0.0.0 special case) plus a strong generated password is the trade-off made instead.
resource "azurerm_mssql_firewall_rule" "allow_azure_services" {
  name             = "allow-azure-services"
  server_id        = azurerm_mssql_server.api.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
