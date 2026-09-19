import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { PhantomCard } from '../components/PhantomCard';
import { ResultOverlay } from '../components/Overlay';
import { usePhantom } from '../lib/store';
import { cycleLabel, dateLabel, money, remaining, timeLabel } from '../lib/format';
import type { ChargeResult } from '../types';

export function SubscriptionDetails() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { subscriptions, cards, cardFor, historyFor, link, charge, deleteSubscription } =
    usePhantom();

  const [busy, setBusy] = useState<null | 'link' | 'charge' | 'cancel'>(null);
  const [result, setResult] = useState<ChargeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sub = subscriptions.find((s) => s.id === id);
  if (!sub) {
    return (
      <div className="min-h-screen p-8">
        <div className="panel mx-auto max-w-2xl px-6 py-16 text-center">
          <p className="text-white">That subscription is not in this session.</p>
          <Button variant="secondary" className="mt-4" onClick={() => navigate('/subscriptions')}>
            Back to Subscriptions
          </Button>
        </div>
      </div>
    );
  }

  const linked = cardFor(sub.id);
  // A card already paying for something else cannot be double-booked.
  const available = cards.filter((c) => !c.linkedSubscriptionId || c.id === linked?.id);
  const history = linked ? historyFor(linked.id) : [];

  async function onLink(cardId: string) {
    setBusy('link');
    setError(null);
    try {
      await link(sub!.id, cardId === '' ? null : cardId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not link that card');
    } finally {
      setBusy(null);
    }
  }

  async function onCharge() {
    setBusy('charge');
    setError(null);
    try {
      setResult(await charge(sub!.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The charge could not be attempted');
    } finally {
      setBusy(null);
    }
  }

  async function onCancel() {
    setBusy('cancel');
    try {
      await deleteSubscription(sub!.id);
      navigate('/subscriptions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel');
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => navigate('/subscriptions')}
          className="mb-8 text-gray-400 transition-colors duration-200 hover:text-white"
        >
          ← Back to Subscriptions
        </button>

        <div className="panel p-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white">{sub.name}</h1>
            <span className="rounded-full bg-green-500/20 px-4 py-2 text-green-400">{sub.status}</span>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <Field label="Price">
                <span className="text-2xl font-bold text-white">{money(sub.price, true)}</span>
                <span className="ml-1 text-sm text-gray-400">/{cycleLabel(sub.billingCycle)}</span>
              </Field>
              <Field label="Billing Cycle">
                <span className="text-lg text-white">{sub.billingCycle}</span>
              </Field>
              <Field label="Next Billing Date">
                <span className="text-lg text-white">{dateLabel(sub.nextBillingDate)}</span>
              </Field>
              <Field label="Start Date">
                <span className="text-lg text-white">{dateLabel(sub.startDate)}</span>
              </Field>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-400">Payment Method</h3>

              <select
                value={linked?.id ?? ''}
                disabled={busy === 'link'}
                onChange={(e) => void onLink(e.target.value)}
                className="field"
              >
                <option value="">Your real card (no protection)</option>
                {available.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.cardType} •••• {card.last4} — {card.cardHolder}
                  </option>
                ))}
              </select>

              {available.length === 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  No cards yet.{' '}
                  <button
                    onClick={() => navigate('/virtual-cards')}
                    className="text-blue-400 hover:underline"
                  >
                    Create one in your name
                  </button>
                  , then link it here.
                </p>
              )}

              <p className="mt-3 text-xs leading-relaxed text-gray-500">
                {linked
                  ? `Linking set a ${money(linked.spendingLimit?.amount ?? 0)} cap on this card and locked it to ${sub.name}. Nothing else can charge it.`
                  : 'Right now this subscription would be billed to your real card, which the merchant would keep.'}
              </p>

              {linked && (
                <div className="mt-5">
                  <PhantomCard card={linked} subscriptionName={sub.name} />
                </div>
              )}
            </div>
          </div>

          {sub.description && (
            <div className="mb-8">
              <h3 className="mb-2 text-sm font-medium text-gray-400">Description</h3>
              <p className="text-gray-300">{sub.description}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Billing run — the demo's moment of truth. */}
          <div className="rounded-xl border border-gray-800/50 bg-black/30 p-6">
            <h3 className="text-sm font-medium text-white">Run a billing charge</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              The authorization is judged against this card&rsquo;s rules before anything is
              captured.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <Button onClick={() => void onCharge()} loading={busy === 'charge'} disabled={!linked}>
                Charge {money(sub.price, true)}
              </Button>
              {linked ? (
                <span className="text-xs text-gray-500">
                  {money(remaining(linked))} of this period&rsquo;s limit left
                </span>
              ) : (
                <span className="text-xs text-gray-500">Link a card first.</span>
              )}
            </div>
          </div>

          {history.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-4 text-sm font-medium text-gray-400">Payment History</h3>
              <div className="space-y-3">
                {history.map((tx) => {
                  const ok = tx.status === 'approved';
                  return (
                    <div
                      key={tx.id}
                      className="flex items-start justify-between gap-4 rounded-lg bg-gray-800/50 p-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-white">{tx.merchantName}</p>
                        <p className="mt-0.5 text-sm text-gray-400">
                          {timeLabel(tx.createdAt)}
                          {tx.declineReason ? ` · ${tx.declineReason}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`font-medium ${ok ? 'text-white' : 'text-gray-500 line-through'}`}>
                          {money(tx.amount, true)}
                        </p>
                        <span className={`text-sm ${ok ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-4">
            <Button variant="danger" className="px-6 py-3" onClick={() => void onCancel()} loading={busy === 'cancel'}>
              Cancel Subscription
            </Button>
            {linked && (
              <Button variant="secondary" className="px-6 py-3" onClick={() => navigate('/virtual-cards')}>
                Manage the card
              </Button>
            )}
          </div>
        </div>
      </div>

      {result && <ResultOverlay result={result} onClose={() => setResult(null)} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400">{label}</h3>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
