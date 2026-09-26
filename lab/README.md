# The AKS lab

This is the first version of how krahler.com was hosted: a containerized nginx image on Azure Kubernetes Service, with Gateway API, cert-manager and Container Insights. Production moved first to Azure Static Web Apps, and later added a Spring Boot API and an Azure SQL database, because Kubernetes was more than a one-page site needs and cost real money to keep up. The lab is kept so the whole setup can be brought up, demonstrated and torn down on demand. It was destroyed on 2026-09-20 (see below); this README describes bringing it back.

It has its **own Terraform state** (`portfolio.tfstate`, separate from the site's `site.tfstate` and the API's `api.tfstate`), so nothing you do here can affect the public site or the API.

## What is here

| Path | What it is |
|---|---|
| `terraform/` | AKS, ACR, gateway public IP, cert-manager, ClusterIssuers, and the lab's monitoring (Log Analytics, App Insights, availability test, Container Insights) |
| `k8s/` | Deployment, Service, Gateway, HTTPRoute, NetworkPolicy, namespaces |
| `Dockerfile`, `nginx.conf`, `security.conf` | The image: multi-stage build, non-root nginx, security headers |
| `../.github/workflows/lab-deploy.yml` | Manual-only pipeline: build, Trivy scan, push, provenance, rollout by digest |

## Bring it up

```bash
cd lab/terraform
cp backend.hcl.example backend.hcl            # key stays portfolio.tfstate
cp terraform.tfvars.example terraform.tfvars  # acr_name, acme_email, alert_email
terraform init -backend-config=backend.hcl
terraform apply
```

Then run the `lab-deploy` workflow (Actions -> lab-deploy -> Run workflow). It needs the repo variables `REGISTRY`, `RESOURCE_GROUP`, `CLUSTER_NAME` and `DEPLOYMENT`. Run it from `main`: it uses the `production` GitHub environment, which since 2026-09-22 only accepts deployments from `main`, so a run started from `dev` will be rejected before it reaches Azure.

To build the image locally, the build context is the **repo root**, not `lab/`:

```bash
podman build -f lab/Dockerfile -t portfolio \
  --build-arg VITE_GITHUB_USER=<user> --build-arg VITE_CONTACT_EMAIL=<email> .
podman run --rm -p 8080:8080 portfolio
```

## Current state (as of 2026-09-20)

The lab is fully destroyed: no AKS cluster, no ACR, no cert-manager, no gateway IP. Terraform state for this root is empty. Rebuilding from scratch needs a new public IP (the old one, `74.249.169.222`, was released, not kept) and a new hostname (see below): there's no fast path back to exactly how it was.

## Things to know before bringing it up again

- **Its hostname is stale.** `k8s/gateway.yaml` and `k8s/httproute.yaml` still name `krahler.com`, but that name now points at Static Web Apps. cert-manager's certificate challenge and the public URL will not work until you change both to a lab hostname (for example `lab.krahler.com`) and add a DNS record for it, pointed at whatever new IP `terraform apply` creates.
- **A full `terraform plan` fails while the cluster is stopped.** The `kubernetes_manifest` resources need the API server even at plan time. Start the cluster first (`az aks start`), or use `-target`.
- **The gateway public IP no longer exists.** A fresh `terraform apply` creates a new one from scratch (no `prevent_destroy` conflict to work around, since there's nothing left to protect); it just means the IP will be different from any address referenced elsewhere.
- **Cost, roughly, from the Azure cost export while it last ran:** the node about $1.6 a day while running, plus about $1 a day for the load balancer, public IP and registry even when the node is stopped. Destroy the lab when you are not using it. These are approximations, not a quote.
- The Terraform plan used to show an in-place change on the AKS cluster (`default_node_pool.upgrade_settings` differing from Azure's defaults). Harmless if it reappears on a fresh apply, but review it before applying.
