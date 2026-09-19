import type { BillingCycle, SpendingLimit, VirtualCard } from '../types';

/** Cents -> "$14.99". Whole dollars drop the ".00" so limits read as "$20". */
export function money(cents: number, alwaysCents = false): string {
  const dollars = cents / 100;
  const fractionDigits = !alwaysCents && Number.isInteger(dollars) ? 0 : 2;
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  });
}

export function cycleLabel(cycle: BillingCycle): string {
  return cycle.toLowerCase();
}

export function limitLabel(limit: SpendingLimit | null): string {
  if (!limit) return 'No limit set';
  const per =
    limit.interval === 'per_authorization' ? 'per charge' : `/ ${limit.interval.replace('ly', '')}`;
  return `${money(limit.amount)} ${per}`;
}

/** "4242424242429182" -> "4242 4242 4242 9182" */
export function groupPan(pan: string): string {
  return pan.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
}

export function maskedPan(last4: string): string {
  return `•••• •••• •••• ${last4}`;
}

export function expLabel(month: number, year: number): string {
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
}

export function remaining(card: VirtualCard): number {
  if (!card.spendingLimit) return 0;
  return Math.max(0, card.spendingLimit.amount - card.spentThisPeriod);
}

export function spentFraction(card: VirtualCard): number {
  if (!card.spendingLimit || card.spendingLimit.amount <= 0) return 0;
  return Math.min(1, card.spentThisPeriod / card.spendingLimit.amount);
}

export function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
