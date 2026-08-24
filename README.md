# odosian-stack

Deployment tooling for a self-hosted stack: **Odosian** (detection rule coverage app), an **Elastic SIEM** backend (Elasticsearch, Kibana, Fleet Server via ECK), and optionally **KubeVision** (a live Kubernetes topology viewer) — all deployed to a local single-node k3s cluster.

This repo contains only `stack/` — the scripts that install prerequisites and deploy everything. Odosian and KubeVision live in their own repos and get pulled in automatically:

- https://github.com/Hidra141/odosian
- https://github.com/Hidra141/kubevision

## Layout

```
stack/
  build.sh              First-time setup: installs prerequisites, clones odosian/kubevision, deploys
  up.sh                  Brings the stack up (idempotent, safe to re-run)
  update.sh               Pulls the latest odosian/kubevision and optionally redeploys
  down.sh                 Powers everything off without deleting anything
  status.sh                Shows what's running and the access URLs
  destroy.sh                Tears the stack down
  elastic-siem-chart/        Helm chart for Elasticsearch/Kibana/Fleet Server (bundled here — no separate repo)
```

## Requirements

- Ubuntu/Debian-based Linux (or WSL2), with `sudo` access
- ~8GB RAM available, a few GB of free disk
- Internet access (downloads k3s, Helm, container images, the odosian/kubevision repos, etc.)

## Quickstart

```bash
git clone https://github.com/Hidra141/odosian-stack.git
cd odosian-stack
./stack/build.sh
```

`build.sh` installs whatever's missing — k3s, Helm, nerdctl, BuildKit — clones `odosian/` (and `kubevision/` if you opt in) as siblings of `stack/`, asks for a MetalLB IP range (a few unused IPs on your LAN), and brings the whole stack up.

Non-interactive:

```bash
./stack/build.sh --with-kubevision
./stack/build.sh --no-kubevision
```

On first run it also generates local secrets (JWT signing key, NextAuth secret, Kibana encryption key) into `*.local.yaml` files — gitignored in each project, never committed.

## Pulling in updates

If odosian or kubevision get updated upstream, `build.sh` won't re-pull them (it only clones once). Use:

```bash
./stack/update.sh                    # pulls odosian, and kubevision if already installed
./stack/update.sh --with-kubevision  # also pulls kubevision in if you skipped it originally
```

It'll offer to rebuild and redeploy afterward.

## Day-to-day

- `up.sh` — bring the stack up (pass `--rebuild` to rebuild images and redeploy)
- `down.sh` — power everything off without deleting anything (frees CPU/RAM)
- `status.sh` — show what's running and the access URLs
- `destroy.sh` — tear the stack down (`--full` also deletes app databases, `--reset-k3s` wipes k3s itself)

## After first deploy

- Odosian's default login is `admin@odosian.com` / `Admin@123!` — **change it after logging in.**
- Edit `odosian/k8s/secret.local.yaml` to add real SMTP and AI provider keys if you want email verification or AI features to work.
