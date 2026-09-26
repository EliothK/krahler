# A tripwire, not a spending cap: the API, its database and logs normally cost about $0.33 a month.
# INC-002 (the database that never paused) billed $7.50 to $10 a day and was only found days later by reading the cost export by hand.
# Budgets can't be daily, so the budget is set tiny instead: a day like that crosses the first threshold the day it happens (cost data lags a few hours).
resource "azurerm_consumption_budget_resource_group" "api" {
  name              = "budget-${var.project}-api"
  resource_group_id = azurerm_resource_group.api.id
  amount            = 2
  time_grain        = "Monthly"

  time_period {
    start_date = "2026-09-01T00:00:00Z" # must be the first of a month
  }

  notification {
    enabled        = true
    threshold      = 50 # percent: $1 of actual spend, about three months of normal use
    operator       = "GreaterThan"
    contact_emails = [var.alert_email]
  }

  notification {
    enabled        = true
    threshold      = 100
    operator       = "GreaterThan"
    threshold_type = "Forecasted" # a smaller leak that would still end the month over budget
    contact_emails = [var.alert_email]
  }

  lifecycle {
    # Azure rejects a start date in the past on update, and this one is only ever the first budget month.
    ignore_changes = [time_period]
  }
}
