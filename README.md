# grad

A self-hosted stack: **Odosian** (detection rule coverage app), an **Elastic SIEM** backend (Elasticsearch, Kibana, Fleet Server via ECK), and optionally **KubeVision** (a live Kubernetes topology viewer for the cluster this all runs on) — all deployed to a local single-node k3s cluster.

## Layout

```
odosian/             Next.js app + k8s/ manifests
kubevision/           Next.js app + Helm chart (optional component)
elastic-siem-chart/   Helm chart for Elasticsearch/Kibana/Fleet Server (via ECK)
stack/                Scripts that install and run everything
```

## Requirements

- Ubuntu/Debian-based Linux (or WSL2), with `sudo` access
- ~8GB RAM available, a few GB of free disk
- Internet access (downloads k3s, Helm, container images, etc.)

## Quickstart

```bash
git clone https://github.com/MohdAlkafaween/grad.git
cd grad
./stack/build.sh
```

`build.sh` installs everything this needs if it isn't already on the machine — k3s, Helm, nerdctl, and BuildKit — then asks whether to also build and deploy KubeVision (`y`/`N`), asks for a MetalLB IP range (a handful of unused IPs on your LAN), and brings the whole stack up. It's safe to re-run.

Non-interactive:

```bash
./stack/build.sh --with-kubevision
./stack/build.sh --no-kubevision
```

On first run it also generates a few local secrets (JWT signing key, NextAuth secret, Kibana encryption key) — these are written to `*.local.yaml` files that are gitignored and never committed.

## Day-to-day

Once set up, you don't need `build.sh` again — use these from `stack/`:

- `up.sh` — bring the stack up (pass `--rebuild` to rebuild images and redeploy)
- `down.sh` — power everything off without deleting anything (frees CPU/RAM)
- `status.sh` — show what's running and the access URLs
- `destroy.sh` — tear the stack down (`--full` also deletes app databases, `--reset-k3s` wipes k3s itself)

## After first deploy

- Odosian's default login is `admin@odosian.com` / `Admin@123!` — **change it after logging in.**
- Edit `odosian/k8s/secret.local.yaml` to add real SMTP and AI provider keys if you want email verification or AI features to work.
