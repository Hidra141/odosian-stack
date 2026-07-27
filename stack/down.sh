#!/bin/bash
# Power everything off to free up CPU/RAM. Nothing is deleted — all data,
# images, and deployed resources are preserved on disk and come back
# exactly as they were when you run up.sh again.
set -euo pipefail

echo "Stopping buildkitd..."
sudo systemctl stop buildkitd 2>/dev/null || true

echo "Stopping k3s and every pod (Odosian, Elasticsearch, Kibana, Fleet Server, MetalLB)..."
# Plain 'systemctl stop k3s' is NOT enough: k3s uses KillMode=process so pods
# survive a service restart, meaning containerd-shim processes (and everything
# they supervise: Elasticsearch's JVM, Kibana's node process, etc.) keep running
# in the background and keep consuming CPU/RAM. k3s-killall.sh is the official
# script that actually tears all of that down.
sudo /usr/local/bin/k3s-killall.sh >/dev/null 2>&1

echo "Stack is down. Nothing was deleted — run ~/stack/up.sh to bring it all back."
