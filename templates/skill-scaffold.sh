#!/usr/bin/env bash
# templates/skill-scaffold.sh
#
# Convenience wrapper — calls the canonical scaffold script at scripts/scaffold.sh.
# This file exists so that users who find the templates/ directory can run it directly.
#
# Usage:
#   bash templates/skill-scaffold.sh
#
# Or via pnpm:
#   pnpm scaffold

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/../scripts/scaffold.sh" "$@"
