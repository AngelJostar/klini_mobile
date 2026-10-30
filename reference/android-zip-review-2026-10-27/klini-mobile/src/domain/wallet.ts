export interface WalletMovement {
  id: string;
  date: string;
  concept: string;
  amount: number;
}
export interface Wallet {
  balance: number;
  movements: WalletMovement[];
}
export const initialWallet: Wallet = { balance: 860, movements: [] };
export const money = (value: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
export function isWallet(value: unknown): value is Wallet {
  if (!value || typeof value !== 'object') return false;
  const w = value as Wallet;
  return (
    Number.isFinite(w.balance) &&
    w.balance >= 0 &&
    Array.isArray(w.movements) &&
    w.movements.every(
      (m) =>
        m &&
        typeof m.id === 'string' &&
        typeof m.date === 'string' &&
        typeof m.concept === 'string' &&
        Number.isFinite(m.amount),
    ) &&
    new Set(w.movements.map((m) => m.id)).size === w.movements.length
  );
}
export function rechargeWallet(wallet: Wallet, amount: number, id: string, date: string): Wallet {
  if (!Number.isFinite(amount) || amount < 10 || amount > 100000)
    throw new Error('Ingresa un importe entre $10 y $100,000.');
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001)
    throw new Error('Usa como máximo dos decimales.');
  amount = Math.round(amount * 100) / 100;
  if (wallet.movements.some((m) => m.id === id))
    throw new Error('Esta recarga ya está registrada.');
  return {
    balance: Math.round((wallet.balance + amount) * 100) / 100,
    movements: [{ id, date, concept: 'Recarga de demostración', amount }, ...wallet.movements],
  };
}
export function walletTotals(wallet: Wallet) {
  return {
    credits: wallet.movements.reduce((sum, m) => sum + Math.max(0, m.amount), 0),
    debits: wallet.movements.reduce((sum, m) => sum + Math.abs(Math.min(0, m.amount)), 0),
    count: wallet.movements.length,
  };
}
