// Token vault adapter — wraps the vault SDK so the rest of the app never sees a
// raw PAN. Backs AB#503 (Add token vault adapter).
export class VaultAdapter {
  constructor(vault) {
    this.vault = vault;
  }

  async read(cardId) {
    return this.vault.get(cardId);
  }

  async write(cardId, pan) {
    return this.vault.issue(cardId, pan);
  }

  async rotate(cardId) {
    const current = await this.read(cardId);
    if (!current) throw new Error(`no token for ${cardId}`);
    return this.vault.reissue(current);
  }
}
