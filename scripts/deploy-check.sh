#!/usr/bin/env bash
# Pre-deploy checks: build, test, env validation.
# Usage: ./scripts/deploy-check.sh
set -e
echo "Running deploy checks..."
npm run validate-env
npm run build
npm run test
echo "All checks passed."
