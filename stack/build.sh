#!/bin/bash
# Fresh-machine bootstrap: installs everything this stack needs (k3s, helm,
# nerdctl, buildkit), then brings the whole stack up via up.sh.
#
# Meant to be handed to someone who has never set this machine up before —
# just clone this repo and run stack/build.sh. It expects to find odosian/
# and elastic-siem-chart/ (and optionally kubevision/) as sibling folders
# next to stack/, i.e. this script's own repo checkout.
#
# KubeVision is optional. Answer the prompt, or skip it with a flag:
#   ./build.sh --with-kubevision
#   ./build.sh --no-kubevision
set -euo pipefail

STACK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$STACK_DIR/.." && pwd)"
ODOSIAN_DIR="$REPO_ROOT/odosian"
KUBEVISION_DIR="$REPO_ROOT/kubevision"
ECK_CHART_DIR="$REPO_ROOT/elastic-siem-chart"

NERDCTL_VERSION="2.3.5"
BUILDKIT_VERSION="0.31.2"

log() { echo -e "\n\033[1;35m==> $1\033[0m"; }
err() { echo -e "\033[1;31mERROR: $1\033[0m" >&2; }

log "[0/7] Checking required project folders"
missing=0
for d in "$ODOSIAN_DIR" "$ECK_CHART_DIR"; do
  if [ ! -d "$d" ]; then
    err "Missing $d — did you clone the whole repo? This script expects odosian/ and elastic-siem-chart/ next to stack/."
    missing=1
  fi
done
[ "$missing" = "1" ] && exit 1
echo "Found odosian/ and elastic-siem-chart/."

# --- KubeVision: optional ---
WITH_KUBEVISION=""
for arg in "$@"; do
  case "$arg" in
    --with-kubevision) WITH_KUBEVISION="yes" ;;
    --no-kubevision) WITH_KUBEVISION="no" ;;
  esac
done
if [ -z "$WITH_KUBEVISION" ]; then
  read -rp "Build and deploy KubeVision too? [y/N] " ans
  case "$ans" in
    [Yy]*) WITH_KUBEVISION="yes" ;;
    *) WITH_KUBEVISION="no" ;;
  esac
fi
if [ "$WITH_KUBEVISION" = "yes" ] && [ ! -d "$KUBEVISION_DIR" ]; then
  err "You chose KubeVision but $KUBEVISION_DIR doesn't exist. Skipping it instead."
  WITH_KUBEVISION="no"
fi
echo "KubeVision: $WITH_KUBEVISION"

log "[1/7] Base packages (curl, openssl, python3)"
if ! command -v curl &>/dev/null || ! command -v openssl &>/dev/null || ! command -v python3 &>/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq curl openssl ca-certificates python3
else
  echo "Already present."
fi

log "[2/7] k3s"
if ! command -v k3s &>/dev/null; then
  echo "Installing k3s..."
  curl -sfL https://get.k3s.io | sh -
else
  echo "k3s already installed."
fi
sudo systemctl enable --now k3s
echo "Waiting for node to be Ready..."
until sudo k3s kubectl get nodes 2>/dev/null | grep -q " Ready"; do sleep 2; done
echo "k3s is up."

mkdir -p "$HOME/.kube"
if [ ! -f "$HOME/.kube/config" ]; then
  sudo cp /etc/rancher/k3s/k3s.yaml "$HOME/.kube/config"
  sudo chown "$(id -u):$(id -g)" "$HOME/.kube/config"
fi
export KUBECONFIG="$HOME/.kube/config"
if ! grep -qs "KUBECONFIG=$HOME/.kube/config" "$HOME/.bashrc"; then
  echo "export KUBECONFIG=$HOME/.kube/config" >> "$HOME/.bashrc"
  echo "Added KUBECONFIG to ~/.bashrc — open a new shell (or 'source ~/.bashrc') after this finishes."
fi

log "[3/7] Helm"
if ! command -v helm &>/dev/null; then
  echo "Installing Helm..."
  curl -sfL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
else
  echo "Helm already installed."
fi

ARCH=$(dpkg --print-architecture 2>/dev/null || uname -m)
case "$ARCH" in
  amd64|x86_64) PKG_ARCH="amd64" ;;
  arm64|aarch64) PKG_ARCH="arm64" ;;
  *) err "Unsupported architecture: $ARCH"; exit 1 ;;
esac

log "[4/7] nerdctl (builds container images against k3s's containerd)"
if ! command -v nerdctl &>/dev/null; then
  echo "Installing nerdctl v${NERDCTL_VERSION}..."
  curl -sfL -o /tmp/nerdctl.tar.gz \
    "https://github.com/containerd/nerdctl/releases/download/v${NERDCTL_VERSION}/nerdctl-${NERDCTL_VERSION}-linux-${PKG_ARCH}.tar.gz"
  sudo tar -C /usr/local/bin -xzf /tmp/nerdctl.tar.gz nerdctl
  rm -f /tmp/nerdctl.tar.gz
else
  echo "nerdctl already installed."
fi

log "[5/7] buildkit"
if ! command -v buildkitd &>/dev/null; then
  echo "Installing buildkit v${BUILDKIT_VERSION}..."
  curl -sfL -o /tmp/buildkit.tar.gz \
    "https://github.com/moby/buildkit/releases/download/v${BUILDKIT_VERSION}/buildkit-v${BUILDKIT_VERSION}.linux-${PKG_ARCH}.tar.gz"
  sudo tar -C /usr/local -xzf /tmp/buildkit.tar.gz
  rm -f /tmp/buildkit.tar.gz
else
  echo "buildkit already installed."
fi

if [ ! -f /etc/systemd/system/buildkitd.service ]; then
  echo "Wiring buildkitd to k3s's containerd..."
  sudo tee /etc/systemd/system/buildkitd.service >/dev/null <<'UNIT'
[Unit]
Description=BuildKit daemon (using k3s containerd)
After=k3s.service
Requires=k3s.service

[Service]
ExecStart=/usr/local/bin/buildkitd --addr unix:///run/buildkit/buildkitd.sock --containerd-worker=true --containerd-worker-addr=/run/k3s/containerd/containerd.sock --containerd-worker-namespace=k8s.io --oci-worker=false
Restart=always
RestartSec=5s

[Install]
WantedBy=multi-user.target
UNIT
  sudo systemctl daemon-reload
fi
sudo systemctl enable --now buildkitd

log "[6/7] MetalLB IP pool"
echo "MetalLB hands out real IPs on your LAN for Odosian/Kibana/KubeVision."
echo "Pick a small range of IPs your router will NEVER assign via DHCP."
DEFAULT_IP=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if ($i=="src") print $(i+1)}')
if [ -n "$DEFAULT_IP" ]; then
  BASE=$(echo "$DEFAULT_IP" | cut -d. -f1-3)
  SUGGESTED="${BASE}.240-${BASE}.250"
else
  SUGGESTED="192.168.1.240-192.168.1.250"
fi
read -rp "MetalLB IP range [${SUGGESTED}]: " NEWRANGE
NEWRANGE="${NEWRANGE:-$SUGGESTED}"
sed -E -i "s#^([[:space:]]*-[[:space:]]*)[0-9]{1,3}(\.[0-9]{1,3}){3}-[0-9]{1,3}(\.[0-9]{1,3}){3}[[:space:]]*\$#\1${NEWRANGE}#" \
  "$STACK_DIR/metallb-pool.yaml"
echo "MetalLB pool set to ${NEWRANGE}."

log "[7/7] Bringing the stack up"
if [ "$WITH_KUBEVISION" = "yes" ]; then
  export SKIP_KUBEVISION=0
else
  export SKIP_KUBEVISION=1
fi
bash "$STACK_DIR/up.sh"

echo -e "\nDone. Before real use, edit odosian/k8s/secret.local.yaml with your own SMTP/AI keys, then re-run this script or ~/stack/up.sh --rebuild."
