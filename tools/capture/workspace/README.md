# ado-demo

Demo workspace for the ADO Code marketing screenshots — the *Payment Platform
Overhaul* epic. Checkout talks to a card vault instead of storing a raw PAN.

- `src/vault/adapter.js` — token read/write/rotate around the vault SDK.
- `src/checkout.js` — checkout flow that resolves a card token before charging.
- `scripts/migrate-card-tokens.js` — idempotent backfill of legacy cards.
- `test/` — `node --test` suite used by the verification gates.
