# cert-manager doesn't survive a `terraform destroy`/`apply` cycle unless it's provisioned here - it was previously installed by hand via `helm install`, which meant every fresh cluster came up without it and TLS silently broke.
#
# Auth uses the cluster's local admin credentials rather than az CLI exec, which puts a client cert/key into state.
# Acceptable tradeoff at this scale: state is already remote and access-controlled, and it avoids a dependency on the az CLI being present wherever `terraform apply` runs.
provider "kubernetes" {
  host                   = azurerm_kubernetes_cluster.portfolio.kube_config[0].host
  client_certificate     = base64decode(azurerm_kubernetes_cluster.portfolio.kube_config[0].client_certificate)
  client_key             = base64decode(azurerm_kubernetes_cluster.portfolio.kube_config[0].client_key)
  cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.portfolio.kube_config[0].cluster_ca_certificate)
}

provider "helm" {
  kubernetes {
    host                   = azurerm_kubernetes_cluster.portfolio.kube_config[0].host
    client_certificate     = base64decode(azurerm_kubernetes_cluster.portfolio.kube_config[0].client_certificate)
    client_key             = base64decode(azurerm_kubernetes_cluster.portfolio.kube_config[0].client_key)
    cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.portfolio.kube_config[0].cluster_ca_certificate)
  }
}

resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  version          = "v1.21.2"
  namespace        = "cert-manager"
  create_namespace = true

  # Gateway API support is off by default in the chart; without it cert-manager's gateway-shim controller never watches Gateway resources for the cert-manager.io/cluster-issuer annotation, and no Certificate ever gets created.
  set {
    name  = "crds.enabled"
    value = "true"
  }
  set {
    name  = "config.apiVersion"
    value = "controller.config.cert-manager.io/v1alpha1"
  }
  set {
    name  = "config.kind"
    value = "ControllerConfiguration"
  }
  set {
    name  = "config.enableGatewayAPI"
    value = "true"
  }
}

locals {
  cluster_issuers = {
    staging = {
      name   = "letsencrypt-staging"
      server = "https://acme-staging-v02.api.letsencrypt.org/directory"
    }
    prod = {
      name   = "letsencrypt-prod"
      server = "https://acme-v02.api.letsencrypt.org/directory"
    }
  }
}

resource "kubernetes_manifest" "cluster_issuer" {
  for_each = local.cluster_issuers

  manifest = {
    apiVersion = "cert-manager.io/v1"
    kind       = "ClusterIssuer"
    metadata = {
      name = each.value.name
    }
    spec = {
      acme = {
        server = each.value.server
        email  = var.acme_email
        privateKeySecretRef = {
          name = "${each.value.name}-account"
        }
        solvers = [
          {
            http01 = {
              gatewayHTTPRoute = {
                parentRefs = [
                  {
                    name      = "portfolio-gateway"
                    namespace = "gateway-system"
                    kind      = "Gateway"
                  }
                ]
              }
            }
          }
        ]
      }
    }
  }

  # These were originally applied by hand with `kubectl apply` before moving into Terraform.
  # Import brought them into state but didn't strip the old "kubectl-client-side-apply" field manager's claim on fields it touched, so server-side apply conflicts on any field that manager still owns
  # (e.g. spec.acme.email) until Terraform takes over as the sole field manager.
  field_manager {
    force_conflicts = true
  }

  depends_on = [helm_release.cert_manager]
}
