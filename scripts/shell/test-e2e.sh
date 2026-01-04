#!/bin/bash

# Tencent Meeting Webhook E2E Test Runner
# This script runs the e2e tests for Tencent Meeting Webhook controller

set -e

echo "🧪 Running Tencent Meeting Webhook E2E Tests..."
echo ""

# Check if .env.test exists, if not create from example
if [ ! -f .env.test ]; then
    echo "⚠️  .env.test not found, creating from .env.test.example..."
    cp .env.test.example .env.test
    echo "⚠️  Please update .env.test with your test configuration values"
fi

# Run the specific e2e test
pnpm test:e2e -- tencent-webhook.e2e-spec.ts

echo ""
echo "✅ All Tencent Meeting Webhook E2E tests passed!"
echo ""
echo "📋 Test Summary:"
echo "   - Webhook URL verification endpoint (GET /webhooks/tencent)"
echo "   - Parameter validation and error handling"
echo "   - Configuration error scenarios"
echo "   - Crypto service integration"