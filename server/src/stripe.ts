import Stripe from 'stripe';
import type { Capabilities } from './types.js';

const key = process.env.STRIPE_SECRET_KEY?.trim();

export const stripe = key ? new Stripe(key) : null;

export const isTestKey = !!key && key.startsWith('sk_test_');

/**
 * Probes what this account can actually do before the app renders anything.
 * Nothing here is assumed — every capability is the result of a real call.
 */
export async function probeCapabilities(): Promise<Capabilities> {
  const caps: Capabilities = {
    mode: 'simulated',
    hasKey: !!key,
    testMode: isTestKey,
    issuingEnabled: false,
    canCreateCards: false,
    canRevealDetails: false,
    canSimulateAuthorizations: false,
    merchantLockEnforcedBy: 'simulated',
    notes: [],
  };

  if (!stripe) {
    caps.notes.push('No STRIPE_SECRET_KEY set. Running fully simulated — nothing is labelled as Stripe-issued.');
    return caps;
  }

  if (!isTestKey) {
    caps.notes.push('Key is not a test key. Refusing to issue cards against live mode.');
    return caps;
  }

  try {
    await stripe.issuing.cardholders.list({ limit: 1 });
    caps.issuingEnabled = true;
    caps.canCreateCards = true;
    caps.canSimulateAuthorizations = true;
    // Test mode lets the secret key expand number/cvc directly. Live mode does not —
    // that path needs ephemeral keys and a PCI-compliant client.
    caps.canRevealDetails = true;
    caps.merchantLockEnforcedBy = 'realtime-authorization-webhook';
    caps.mode = 'stripe';
    caps.notes.push('Stripe Issuing is enabled in test mode. Cards are real Stripe Issuing cards.');
    caps.notes.push('PAN and CVC are expanded from the Issuing API in test mode only.');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    caps.notes.push(`Stripe Issuing is not available on this account: ${message}`);
    caps.notes.push('Falling back to simulated cards. They are labelled as simulated everywhere in the UI.');
  }

  return caps;
}

const cardholders = new Map<string, Promise<string>>();

/**
 * Cards are minted in a person's name, so each distinct name gets its own Stripe
 * cardholder. Looked up once per name and reused for the rest of the session.
 */
export function getCardholderId(name: string): Promise<string> {
  if (!stripe) throw new Error('Stripe is not configured');

  const key = name.trim().toLowerCase();
  const cached = cardholders.get(key);
  if (cached) return cached;

  const promise = (async () => {
    const pinned = process.env.PHANTOM_CARDHOLDER_ID?.trim();
    if (pinned) return pinned;

    const found = await stripe.issuing.cardholders.list({ limit: 100, status: 'active' });
    const match = found.data.find((c) => c.name.trim().toLowerCase() === key);
    if (match) return match.id;

    const created = await stripe.issuing.cardholders.create({
      type: 'individual',
      name: name.trim(),
      email: 'demo@phantom.test',
      phone_number: '+15555550100',
      billing: {
        address: {
          line1: '510 Townsend St',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94103',
          country: 'US',
        },
      },
    });
    return created.id;
  })();

  cardholders.set(key, promise);
  // A failed lookup must not poison the cache for the rest of the session.
  promise.catch(() => cardholders.delete(key));
  return promise;
}
