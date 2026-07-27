# Odosian — K3s Deployment Guide

## Prerequisites

- K3s cluster with Traefik ingress controller
- `kubectl` configured to access the cluster
- Container registry access (e.g., GHCR, Docker Hub)
- TLS certificate (via cert-manager or manual)

## 1. Build and Push the Docker Image

```bash
docker build -t ghcr.io/mohdalkafaween/odosian:latest .
docker push ghcr.io/mohdalkafaween/odosian:latest
```

## 2. Create the Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

## 3. Configure Secrets

Edit `k8s/secret.yaml` and replace all `REPLACE_WITH_*` placeholder values with real credentials. **Never commit real secrets to version control.**

```bash
kubectl apply -f k8s/secret.yaml
```

## 4. Apply ConfigMap

Update `k8s/configmap.yaml` with your domain and settings, then apply:

```bash
kubectl apply -f k8s/configmap.yaml
```

## 5. Create the PersistentVolumeClaim

```bash
kubectl apply -f k8s/pvc.yaml
```

## 6. Deploy the Application

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

## 7. Configure Ingress

Update the host in `k8s/ingress.yaml` to your domain, then apply:

```bash
kubectl apply -f k8s/ingress.yaml
```

## 8. Run Database Migrations and Seed

```bash
kubectl exec -n odosian deploy/odosian -- npx prisma migrate deploy --schema=prisma/schema.prisma
kubectl exec -n odosian deploy/odosian -- npx prisma db seed
```

## 9. Verify the Deployment

```bash
# Check pod status
kubectl get pods -n odosian

# Check health endpoint
kubectl exec -n odosian deploy/odosian -- wget -qO- http://localhost:3000/api/health

# Check logs
kubectl logs -n odosian deploy/odosian
```

## Default Accounts

| Email                | Password      | Role    |
|----------------------|---------------|---------|
| admin@odosian.com    | Admin@123!    | ADMIN   |
| analyst@odosian.com  | Analyst@123!  | ANALYST |

**Change these passwords immediately after first login.**

## Notes

- **Single replica only** — SQLite does not support concurrent writers across pods.
- **TLS** is handled at the Ingress level via Traefik. Configure cert-manager or provide a TLS secret manually.
- **Backups** — periodically copy `/data/odosian.db` from the PVC to a safe location.
