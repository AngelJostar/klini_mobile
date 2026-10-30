export interface TokenWallet {
  balance: number;
  movements: { id: number; amount: number; concept: string; created_at: string }[];
}
// The supplied Laravel endpoint requires a signed-in session. No local token credits.
export async function loadWalletTokens(signal?: AbortSignal): Promise<TokenWallet> {
  const base = process.env.EXPO_PUBLIC_WALLET_API_URL;
  if (!base) throw new Error('Conecta tu cuenta para consultar tus Tokens.');
  const response = await fetch(`${base.replace(/\/$/, '')}/wallet/tokens`, {
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error('No se pudo consultar tu saldo de Tokens.');
  const wallet = await response.json();
  if (
    !Number.isFinite(wallet.balance) ||
    !Array.isArray(wallet.movements) ||
    !wallet.movements.every(
      (m: TokenWallet['movements'][number]) =>
        m &&
        typeof m.concept === 'string' &&
        Number.isFinite(m.amount) &&
        typeof m.created_at === 'string',
    )
  )
    throw new Error('La respuesta de Tokens no es válida.');
  return wallet;
}
