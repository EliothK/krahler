# Subscription-wide, so it belongs with the site and not the lab: cost alerts must survive a lab teardown.
data "azurerm_subscription" "current" {}

resource "azurerm_consumption_budget_subscription" "portfolio" {
  name            = "budget-${var.project}"
  subscription_id = data.azurerm_subscription.current.id
  amount          = 50
  time_grain      = "Monthly"

  time_period {
    start_date = "2026-09-01T00:00:00Z" # must be the first of a month
  }

  notification {
    enabled        = true
    threshold      = 80 # percent
    operator       = "GreaterThan"
    contact_emails = [var.alert_email]
  }

  notification {
    enabled        = true
    threshold      = 100
    operator       = "GreaterThan"
    threshold_type = "Forecasted" # warns before you get there
    contact_emails = [var.alert_email]
  }
}
