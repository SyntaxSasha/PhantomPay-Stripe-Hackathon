import { useState } from 'react';
import { Button } from './Button';
import { usePhantom } from '../lib/store';
import { expLabel } from '../lib/format';
import type { CardType, PhysicalCard, VirtualCard } from '../types';

const TYPES: CardType[] = ['Visa', 'Mastercard', 'Amex'];

/**
 * The real card a virtual card draws on. This is the half of the story the
 * merchant never sees, so the copy is deliberate about which card is which.
 */
export function FundingSection({ card }: { card: VirtualCard }) {
  const { physicalCards, fundingFor, setFunding, addPhysicalCard } = usePhantom();

  const funding = fundingFor(card.id);
  const [picking, setPicking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    cardHolder: card.cardHolder,
    cardType: 'Visa' as CardType,
    lastFour: '',
    issuer: 'Personal',
  });

  async function choose(id: string | null) {
    setBusy(id ?? 'unlink');
    setError(null);
    try {
      await setFunding(card.id, id);
      setPicking(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not link that card');
    } finally {
      setBusy(null);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(form.lastFour)) {
      setError('Enter the last four digits.');
      return;
    }
    setBusy('add');
    setError(null);
    try {
      await addPhysicalCard(form);
      setForm({ ...form, lastFour: '' });
      setAdding(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that card');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-lg font-medium text-white">Linked Physical Card</h3>
        {!picking && (
          <Button
            variant={funding ? 'ghost' : 'secondary'}
            onClick={() => setPicking(true)}
            className="gap-2"
          >
            <PlusIcon />
            {funding ? 'Change' : 'Link Physical Card'}
          </Button>
        )}
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      {/* ------------------------------------------------------ linked state */}
      {!picking && funding && (
        <div className="rounded-lg bg-gray-800/50 p-4">
          <div className="flex items-center justify-between gap-4">
            <PhysicalRow physical={funding} />
            <Button
              variant="ghost"
              onClick={() => void choose(null)}
              loading={busy === 'unlink'}
            >
              Unlink
            </Button>
          </div>
          <p className="mt-3 border-t border-gray-700/60 pt-3 text-xs leading-relaxed text-gray-400">
            Charges on <span className="text-gray-200">•••• {card.last4}</span> settle to this
            card. {funding.cardType} •••• {funding.lastFour} is never given to the merchant, and
            PhantomPay stores nothing but the last four.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------- empty state */}
      {!picking && !funding && (
        <div className="rounded-lg bg-gray-800/50 p-4">
          <p className="text-center text-gray-400">No physical card linked to this virtual card</p>
        </div>
      )}

      {/* ----------------------------------------------------------- picker */}
      {picking && (
        <div className="rounded-lg bg-gray-800/50 p-4">
          <div className="space-y-2">
            {physicalCards.map((p) => {
              const selected = p.id === funding?.id;
              return (
                <button
                  key={p.id}
                  onClick={() => void choose(p.id)}
                  disabled={busy !== null}
                  className={`flex w-full items-center justify-between gap-4 rounded-lg border p-3
                              text-left transition-colors duration-200 disabled:opacity-50 ${
                                selected
                                  ? 'border-blue-500/60 bg-blue-500/10'
                                  : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                              }`}
                >
                  <PhysicalRow physical={p} />
                  {busy === p.id ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  ) : selected ? (
                    <span className="text-xs text-blue-400">Linked</span>
                  ) : null}
                </button>
              );
            })}

            {physicalCards.length === 0 && (
              <p className="py-3 text-center text-sm text-gray-400">
                No cards in your wallet yet.
              </p>
            )}
          </div>

          {/* ------------------------------------------------- add a new one */}
          {adding ? (
            <form onSubmit={add} className="mt-4 space-y-3 border-t border-gray-700/60 pt-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  value={form.cardHolder}
                  onChange={(e) => setForm({ ...form, cardHolder: e.target.value })}
                  placeholder="Name on the card"
                  className="field"
                  aria-label="Name on the card"
                />
                <select
                  value={form.cardType}
                  onChange={(e) => setForm({ ...form, cardType: e.target.value as CardType })}
                  className="field"
                  aria-label="Card type"
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t === 'Amex' ? 'American Express' : t}
                    </option>
                  ))}
                </select>
                <input
                  value={form.lastFour}
                  onChange={(e) =>
                    setForm({ ...form, lastFour: e.target.value.replace(/\D/g, '').slice(0, 4) })
                  }
                  placeholder="Last four digits"
                  inputMode="numeric"
                  className="field"
                  aria-label="Last four digits"
                />
                <input
                  value={form.issuer}
                  onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                  placeholder="Nickname (Personal, Rewards…)"
                  className="field"
                  aria-label="Nickname"
                />
              </div>
              <p className="text-xs text-gray-500">
                Last four only — PhantomPay has no use for the full number.
              </p>
              <div className="flex gap-2">
                <Button type="submit" loading={busy === 'add'}>
                  Add to wallet
                </Button>
                <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-4 flex gap-2 border-t border-gray-700/60 pt-4">
              <Button variant="ghost" onClick={() => setAdding(true)} className="gap-2">
                <PlusIcon />
                Add a card
              </Button>
              <Button variant="ghost" onClick={() => setPicking(false)}>
                Done
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PhysicalRow({ physical }: { physical: PhysicalCard }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <MiniCard type={physical.cardType} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">
          {physical.cardType} •••• {physical.lastFour}
        </p>
        <p className="truncate text-xs text-gray-400">
          {physical.cardHolder} · {physical.issuer} · exp{' '}
          {expLabel(physical.expMonth, physical.expYear)}
        </p>
      </div>
    </div>
  );
}

/** A little plastic rectangle so the row reads as a card at a glance. */
function MiniCard({ type }: { type: CardType }) {
  const skin = {
    Visa: 'from-slate-700 to-slate-500',
    Mastercard: 'from-gray-700 to-gray-500',
    Amex: 'from-zinc-700 to-zinc-500',
  }[type];

  return (
    <div
      className={`flex h-8 w-12 shrink-0 items-end rounded bg-gradient-to-br ${skin} p-1 shadow`}
      aria-hidden="true"
    >
      <div className="h-2 w-4 rounded-[2px] bg-yellow-400/80" />
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
