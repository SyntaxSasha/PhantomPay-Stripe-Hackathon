import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { PhantomCard } from '../components/PhantomCard';
import { Overlay } from '../components/Overlay';
import { FundingSection } from '../components/FundingSection';
import { api } from '../lib/api';
import { usePhantom } from '../lib/store';
import { expLabel, limitLabel, money, remaining, timeLabel } from '../lib/format';
import type { CardSecret, CardType, VirtualCard } from '../types';

const TYPES: CardType[] = ['Visa', 'Mastercard', 'Amex'];

export function VirtualCards() {
  const navigate = useNavigate();
  const { cards, subscriptions, subscriptionFor, createCard, error: loadError } = usePhantom();

  const [form, setForm] = useState({
    cardHolder: '',
    cardType: 'Visa' as CardType,
    isDefault: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<VirtualCard | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || form.cardHolder.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      await createCard({
        cardHolder: form.cardHolder.trim(),
        cardType: form.cardType,
        isDefault: form.isDefault,
      });
      setForm({ cardHolder: '', cardType: 'Visa', isDefault: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add virtual card');
    } finally {
      setBusy(false);
    }
  }

  // Keep the modal showing live data after a pause or a link changes underneath it.
  const current = selected ? cards.find((c) => c.id === selected.id) ?? null : null;

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Your Virtual Cards</h1>
            <p className="mt-2 text-gray-400">
              Minted in your name. A card gets its merchant and its limit when you link it to a
              subscription.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/subscriptions')} className="px-4 py-2">
            Back to Subscriptions
          </Button>
        </div>

        {loadError && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-400">
            {loadError}
          </div>
        )}

        {/* ---------------------------------------------------- create form */}
        <div className="panel mb-8 p-8">
          <h2 className="mb-2 text-2xl font-bold text-white">Add New Virtual Card</h2>
          <p className="mb-6 text-sm text-gray-400">
            Issued against a cardholder in this name. It has no merchant and no limit until you
            link it to a subscription.
          </p>

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="cardHolder" className="label">
                  Card Holder Name
                </label>
                <input
                  id="cardHolder"
                  value={form.cardHolder}
                  onChange={(e) => setForm({ ...form, cardHolder: e.target.value })}
                  placeholder="John Doe"
                  autoComplete="off"
                  required
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="cardType" className="label">
                  Card Type
                </label>
                <select
                  id="cardType"
                  value={form.cardType}
                  onChange={(e) => setForm({ ...form, cardType: e.target.value as CardType })}
                  className="field"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t === 'Amex' ? 'American Express' : t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isDefault"
                checked={form.isDefault}
                onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                className="h-4 w-4 rounded border-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-300">
                Set as default card
              </label>
            </div>

            <Button
              type="submit"
              loading={busy}
              disabled={form.cardHolder.trim().length === 0}
              className="w-full px-6 py-3"
            >
              {busy ? 'Minting card…' : 'Add Virtual Card'}
            </Button>

          </form>
        </div>

        {/* ---------------------------------------------------------- grid */}
        {cards.length === 0 ? (
          <div className="panel px-6 py-14 text-center">
            <p className="text-white">No cards yet. Add one above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <div key={card.id}>
                <PhantomCard
                  card={card}
                  subscriptionName={subscriptionFor(card.id)?.name}
                  onClick={() => setSelected(card)}
                />
                <div className="mt-3 flex items-center justify-between px-1 text-xs">
                  <span className="text-gray-400">
                    {card.cardHolder}
                    {card.isDefault && <span className="ml-2 text-blue-400">Default</span>}
                  </span>
                  <span className="text-gray-500">
                    {card.linkedSubscriptionId ? limitLabel(card.spendingLimit) : 'Unlinked'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {subscriptions.length === 0 && cards.length > 0 && (
          <p className="mt-6 text-center text-sm text-gray-500">
            These cards cannot be charged until you{' '}
            <button
              onClick={() => navigate('/add-subscription')}
              className="text-blue-400 hover:underline"
            >
              add a subscription
            </button>{' '}
            and link one.
          </p>
        )}
      </div>

      {current && <CardModal card={current} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CardModal({ card, onClose }: { card: VirtualCard; onClose: () => void }) {
  const navigate = useNavigate();
  const { subscriptionFor, historyFor, fundingFor, setCardStatus, makeDefault, deleteCard } =
    usePhantom();

  const [secret, setSecret] = useState<CardSecret | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [busy, setBusy] = useState<null | 'reveal' | 'status' | 'delete' | 'default'>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const sub = subscriptionFor(card.id);
  const funding = fundingFor(card.id);
  const history = historyFor(card.id);

  async function reveal() {
    if (secret) {
      setFlipped((f) => !f);
      return;
    }
    setBusy('reveal');
    setError(null);
    try {
      const { secret: s } = await api.reveal(card.id);
      setSecret(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reveal the card');
    } finally {
      setBusy(null);
    }
  }

  async function run(kind: 'status' | 'delete' | 'default') {
    setBusy(kind);
    setError(null);
    try {
      if (kind === 'status') {
        await setCardStatus(card.id, card.status === 'active' ? 'paused' : 'active');
      } else if (kind === 'default') {
        await makeDefault(card.id);
      } else {
        await deleteCard(card.id);
        onClose();
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Overlay onClose={onClose}>
      <div className="panel max-h-[85vh] w-full max-w-2xl overflow-y-auto p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{card.cardHolder}</h2>
            <p className="mt-1 text-gray-400">
              {card.brand} •••• {card.last4} · exp {expLabel(card.expMonth, card.expYear)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {card.isDefault && (
              <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs text-blue-400">
                Default
              </span>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 transition-colors duration-200 hover:text-white"
              aria-label="Close"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <PhantomCard
          card={card}
          secret={secret}
          subscriptionName={sub?.name}
          fundingLabel={funding ? `${funding.cardType} •••• ${funding.lastFour}` : undefined}
          flipped={flipped}
          onClick={secret ? () => setFlipped((f) => !f) : undefined}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void reveal()} loading={busy === 'reveal'}>
            {secret ? (flipped ? 'Show front' : 'Show back') : 'Reveal number'}
          </Button>
          <Button variant="secondary" onClick={() => void run('status')} loading={busy === 'status'}>
            {card.status === 'active' ? 'Pause card' : 'Resume card'}
          </Button>
          {!card.isDefault && (
            <Button variant="ghost" onClick={() => void run('default')} loading={busy === 'default'}>
              Make default
            </Button>
          )}
          <Button variant="danger" onClick={() => setConfirming(true)}>
            Delete card
          </Button>
        </div>

        {secret && (
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            Full details are fetched only when you ask for them, and are never stored by PhantomPay.
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Row label="Linked subscription">
            {sub ? (
              <button
                onClick={() => navigate(`/subscriptions/${sub.id}`)}
                className="text-blue-400 hover:underline"
              >
                {sub.name}
              </button>
            ) : (
              <span className="text-gray-500">None — cannot be charged</span>
            )}
          </Row>
          <Row label="Spending limit">{limitLabel(card.spendingLimit)}</Row>
          <Row label="Spent this period">{money(card.spentThisPeriod, true)}</Row>
          <Row label="Remaining">
            {card.spendingLimit ? money(remaining(card)) : <span className="text-gray-500">—</span>}
          </Row>
          <Row label="Status">{card.status}</Row>
          <Row label="Card type">{card.brand}</Row>
          <Row label="Funded by">
            {funding ? (
              `${funding.cardType} •••• ${funding.lastFour}`
            ) : (
              <span className="text-gray-500">Not linked</span>
            )}
          </Row>
        </div>

        {card.stripeCardId && (
          <p className="mt-4 font-mono text-[11px] text-gray-600">{card.stripeCardId}</p>
        )}

        <FundingSection card={card} />

        <div className="mt-8">
          <h3 className="mb-4 text-lg font-medium text-white">Payment History</h3>
          {history.length === 0 ? (
            <p className="py-4 text-center text-gray-400">No payment history available</p>
          ) : (
            <div className="space-y-3">
              {history.map((tx) => {
                const ok = tx.status === 'approved';
                return (
                  <div key={tx.id} className="rounded-lg bg-gray-800/50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-white">{tx.merchantName}</p>
                        <p className="text-sm text-gray-400">
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="panel w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold text-white">Delete this card?</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              The credential stops existing, so nothing further can be authorised on it — including
              anything {sub?.name ?? 'the merchant'} tries to charge later. This does not cancel the
              subscription agreement itself.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="danger"
                className="flex-1 py-3"
                loading={busy === 'delete'}
                onClick={() => void run('delete')}
              >
                Delete card
              </Button>
              <Button variant="ghost" className="py-3" onClick={() => setConfirming(false)}>
                Keep it
              </Button>
            </div>
          </div>
        </div>
      )}
    </Overlay>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-800/60 pb-3">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium text-white">{children}</span>
    </div>
  );
}
