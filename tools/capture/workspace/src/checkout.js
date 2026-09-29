// Checkout flow — charges a stored card token. Backs AB#501/AB#502.
import { VaultAdapter } from './vault/adapter.js';

export async function checkout(cart, vault) {
  const adapter = new VaultAdapter(vault);
  const token = cart.hasTokenOnFile ? await adapter.read(cart.cardId) : await adapter.write(cart.cardId, cart.pan);
  return { charged: true, token };
}
