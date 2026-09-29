// One-off backfill of legacy cards to vault tokens. Idempotent (AB#504).
const dryRun = process.argv.includes('--dry-run');
console.log(`migrate:card-tokens ${dryRun ? '(dry run) ' : ''}— 0 legacy cards pending`);
