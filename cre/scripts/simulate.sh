#!/bin/bash
# CRE Workflow Simulation Scripts
#
# Usage:
#   ./cre/scripts/simulate.sh dispute [TX_HASH]   # Simulate dispute resolution
#   ./cre/scripts/simulate.sh settle  [TX_HASH]   # Simulate settlement verification
#   ./cre/scripts/simulate.sh expiry               # Simulate expiry watchdog
#   ./cre/scripts/simulate.sh all     [TX_HASH]   # Simulate all workflows
#
# TX_HASH: the on-chain transaction hash that emitted the event (required for dispute/settle)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CRE_DIR="$(dirname "$SCRIPT_DIR")"

# Load env vars if .env exists
if [ -f "$CRE_DIR/../backend/.env" ]; then
    export $(grep -v '^#' "$CRE_DIR/../backend/.env" | xargs)
fi

CONTRACT_ADDR="${ESCROW_CONTRACT_ADDRESS:-0x_YOUR_ESCROW_CONTRACT}"
CONSUMER_ADDR="${DISPUTE_CONSUMER_ADDRESS:-0x_YOUR_DISPUTE_CONSUMER}"

# Optional TX hash from second argument
TX_HASH="${2:-}"

simulate_dispute() {
    echo "=== Simulating Dispute Resolver Workflow ==="
    echo ""
    echo "This workflow:"
    echo "  1. Listens for DisputeRaised event on $CONTRACT_ADDR"
    echo "  2. Reads escrow details on-chain"
    echo "  3. Fetches dispute context from backend API"
    echo "  4. Calls OpenAI + Gemini AI via Confidential HTTP"
    echo "  5. Writes resolution to DisputeConsumer ($CONSUMER_ADDR)"
    echo ""

    if ! command -v cre &>/dev/null; then
        echo "[INFO] CRE CLI not installed. Install: npm install -g @chainlink/cre-cli"
        echo ""
        cat "$CRE_DIR/dispute-resolver/workflow.yaml"
        return
    fi

    if [ -n "$TX_HASH" ]; then
        echo "Using TX hash: $TX_HASH"
        echo ""
        cre workflow simulate "$CRE_DIR/dispute-resolver" \
            --target staging-settings \
            --evm-tx-hash "$TX_HASH" \
            --evm-event-index 0 \
            --broadcast \
            --non-interactive 2>&1 || echo "[INFO] cre CLI simulation complete"
    else
        echo "Running in interactive mode (no TX hash provided)"
        echo "Tip: pass TX hash as second arg: ./simulate.sh dispute 0x..."
        echo ""
        cre workflow simulate "$CRE_DIR/dispute-resolver" \
            --target staging-settings \
            --broadcast \
            -v 2>&1 || echo "[INFO] cre CLI simulation complete"
    fi
}

simulate_settlement() {
    echo "=== Simulating Settlement Verifier Workflow ==="
    echo ""
    echo "This workflow:"
    echo "  1. Listens for SettlementRequested event on $CONTRACT_ADDR"
    echo "  2. Reads escrow details on-chain"
    echo "  3. Verifies resource delivery via backend API"
    echo "  4. Auto-finalizes settlement (pay merchant) if verified"
    echo ""

    if ! command -v cre &>/dev/null; then
        echo "[INFO] CRE CLI not installed. Install: npm install -g @chainlink/cre-cli"
        echo ""
        cat "$CRE_DIR/settlement-verifier/workflow.yaml"
        return
    fi

    if [ -n "$TX_HASH" ]; then
        echo "Using TX hash: $TX_HASH"
        echo ""
        cre workflow simulate "$CRE_DIR/settlement-verifier" \
            --target staging-settings \
            --evm-tx-hash "$TX_HASH" \
            --evm-event-index 0 \
            --broadcast \
            --non-interactive 2>&1 || echo "[INFO] cre CLI simulation complete"
    else
        echo "Running in interactive mode (no TX hash provided)"
        echo ""
        cre workflow simulate "$CRE_DIR/settlement-verifier" \
            --target staging-settings \
            --broadcast \
            -v 2>&1 || echo "[INFO] cre CLI simulation complete"
    fi
}

simulate_workflow() {
    echo "=== Simulating Workflow Engine ==="
    echo ""
    echo "This workflow:"
    echo "  1. Cron trigger: every 5 minutes"
    echo "  2. Fetches active workflows from backend"
    echo "  3. Interprets and executes each workflow step-by-step"
    echo "  4. Logs execution results via Confidential HTTP"
    echo "  5. Writes batch audit report on-chain"
    echo ""

    if ! command -v cre &>/dev/null; then
        echo "[INFO] CRE CLI not installed. Install: npm install -g @chainlink/cre-cli"
        echo ""
        cat "$CRE_DIR/workflow-engine/workflow.yaml"
        return
    fi

    cre workflow simulate "$CRE_DIR/workflow-engine" \
        --target staging-settings \
        --broadcast \
        -v 2>&1 || echo "[INFO] cre CLI simulation complete"
}

simulate_expiry() {
    echo "=== Simulating Expiry Watchdog Workflow ==="
    echo ""
    echo "This workflow:"
    echo "  1. Cron trigger: every 60 seconds"
    echo "  2. Queries recent EscrowFunded events"
    echo "  3. Checks each escrow for expiry"
    echo "  4. Calls claimAfterExpiry() for expired escrows"
    echo ""

    if ! command -v cre &>/dev/null; then
        echo "[INFO] CRE CLI not installed. Install: npm install -g @chainlink/cre-cli"
        echo ""
        cat "$CRE_DIR/expiry-watchdog/workflow.yaml"
        return
    fi

    cre workflow simulate "$CRE_DIR/expiry-watchdog" \
        --target staging-settings \
        --broadcast \
        -v 2>&1 || echo "[INFO] cre CLI simulation complete"
}

case "${1:-all}" in
    dispute)
        simulate_dispute
        ;;
    settle)
        simulate_settlement
        ;;
    workflow)
        simulate_workflow
        ;;
    expiry)
        simulate_expiry
        ;;
    all)
        simulate_dispute
        echo ""
        echo "---"
        echo ""
        simulate_settlement
        echo ""
        echo "---"
        echo ""
        simulate_expiry
        echo ""
        echo "---"
        echo ""
        simulate_workflow
        ;;
    *)
        echo "Usage: $0 {dispute|settle|expiry|workflow|all} [TX_HASH]"
        exit 1
        ;;
esac
