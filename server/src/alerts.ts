import { randomUUID } from 'node:crypto';
import { store } from './store.js';
import type { AlertSeverity, AlertType, FraudAlert, VirtualCard } from './types.js';

/**
 * Two sources feed this page.
 *
 * Derived alerts are real: every declined authorization becomes one, because a
 * decline *is* the product working. Scenario alerts are the pre-written set below,
 * seeded once per card so the page has something to show before anything is charged.
 */

interface Scenario {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  /** Takes the card so the copy can name the real last four. */
  describe: (card: VirtualCard, merchant: string) => string;
  /** Minutes before now, so the list has a believable spread. */
  agoMinutes: number;
}

const SCENARIOS: Scenario[] = [
  {
    type: 'multiple_attempts',
    severity: 'high',
    title: 'Repeated charge attempts blocked',
    describe: (card) =>
      `Four attempts to charge $99.99 to the card ending ${card.last4} within two minutes. All four were refused — the amount is over this card's limit.`,
    agoMinutes: 18,
  },
  {
    type: 'unusual_location',
    severity: 'medium',
    title: 'Charge attempted from an unexpected region',
    describe: (card, merchant) =>
      `A terminal in Singapore presented the card ending ${card.last4}. ${merchant} bills from the US, so the attempt was refused.`,
    agoMinutes: 96,
  },
  {
    type: 'suspicious_transaction',
    severity: 'medium',
    title: 'Merchant mismatch',
    describe: (card, merchant) =>
      `An unrecognised merchant tried to charge the card ending ${card.last4}. This card only authorises ${merchant}.`,
    agoMinutes: 420,
  },
];

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60_000).toISOString();
}

/** Seeded once per card, so revisiting the page does not pile up duplicates. */
export function seedAlertsFor(card: VirtualCard): FraudAlert[] {
  const merchant = card.linkedSubscriptionId
    ? (store.subscription(card.linkedSubscriptionId)?.name ?? 'the linked merchant')
    : 'the linked merchant';

  return SCENARIOS.map((s) => ({
    id: randomUUID(),
    cardId: card.id,
    type: s.type,
    severity: s.severity,
    title: s.title,
    description: s.describe(card, merchant),
    date: minutesAgo(s.agoMinutes),
    status: 'active' as const,
    derived: false,
  }));
}

/** Every real decline, as an alert. Recomputed each call — never stored. */
function derivedAlerts(): FraudAlert[] {
  return store
    .transactions()
    .filter((t) => t.status === 'declined')
    .map((t) => ({
      id: `tx-${t.id}`,
      cardId: t.cardId,
      type: 'blocked_charge' as const,
      severity: 'high' as const,
      title: `Charge to ${t.merchantName} refused`,
      description: `${t.merchantName} tried to take $${(t.amount / 100).toFixed(2)}. ${t.declineReason}.`,
      date: t.createdAt,
      status: 'active' as const,
      derived: true,
    }));
}

export function listAlerts(): FraudAlert[] {
  const cards = store.cards();

  // Seed any card that has never been seeded, so the page is never empty.
  for (const card of cards) {
    if (!store.alerts().some((a) => a.cardId === card.id && !a.derived)) {
      for (const alert of seedAlertsFor(card)) store.addAlert(alert);
    }
  }

  const resolved = new Set(
    store.alerts().filter((a) => a.status === 'resolved').map((a) => a.id),
  );

  // Rows with a tx- id are resolution markers for derived alerts, not alerts in
  // their own right — the derived list below already carries them.
  const stored = store
    .alerts()
    .filter((a) => !a.id.startsWith('tx-') && cards.some((c) => c.id === a.cardId));
  const derived = derivedAlerts()
    .filter((a) => cards.some((c) => c.id === a.cardId))
    .map((a) => (resolved.has(a.id) ? { ...a, status: 'resolved' as const } : a));

  return [...derived, ...stored].sort((a, b) => b.date.localeCompare(a.date));
}
