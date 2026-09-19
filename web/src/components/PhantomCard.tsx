import type { CardSecret, CardType, VirtualCard } from '../types';
import { expLabel, groupPan, limitLabel, maskedPan, money, spentFraction } from '../lib/format';

/** Each brand gets its own metal. Straight from the SubscriptionWallet card faces. */
const SKIN: Record<CardType, string> = {
  Visa: 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-600',
  Mastercard: 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-600',
  Amex: 'bg-gradient-to-br from-zinc-800 via-zinc-700 to-zinc-600',
};

/**
 * The hero object. Flips on hover to show the CVV, exactly like the wallet card,
 * but the digits stay masked until the cardholder explicitly reveals them.
 */
export function PhantomCard({
  card,
  secret,
  subscriptionName,
  fundingLabel,
  flipped,
  onClick,
}: {
  card: VirtualCard;
  secret?: CardSecret | null;
  subscriptionName?: string;
  /** e.g. "Visa •••• 4242" — the real card this one settles to. */
  fundingLabel?: string;
  /** Force the flip; leave undefined to flip on hover. */
  flipped?: boolean;
  onClick?: () => void;
}) {
  const skin = SKIN[card.cardType] ?? SKIN.Visa;
  const paused = card.status === 'paused';

  return (
    <div
      onClick={onClick}
      className={`group relative h-56 w-full [perspective:1000px] ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Glossy reflection sweeping over the whole card. */}
      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 animate-gloss bg-gradient-to-br from-white/0 via-white/5 to-white/0" />
      </div>

      <div
        className={`relative h-full w-full preserve-3d transition-transform duration-700
                    ${flipped === undefined ? 'group-hover:[transform:rotateY(180deg)]' : ''}
                    ${flipped ? '[transform:rotateY(180deg)]' : ''}`}
      >
        {/* ------------------------------------------------------------ front */}
        <div
          className={`absolute inset-0 backface-hidden overflow-hidden rounded-2xl p-6 shadow-2xl
                      ${skin} ${paused ? 'opacity-60' : ''}`}
        >
          {paused && (
            <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-black/50">
              <span className="text-lg font-semibold tracking-widest text-white">PAUSED</span>
            </div>
          )}

          {/* Hologram patch */}
          <div className="absolute right-4 top-4 h-10 w-16 overflow-hidden rounded-lg bg-gradient-to-r from-white/20 to-transparent">
            <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-white/40 to-transparent" />
          </div>

          {/* Flow layout, not absolute — a long merchant name must never land on
              top of the cardholder row. */}
          <div className="relative flex h-full flex-col">
            <BrandMark type={card.cardType} />

            {/* Chip */}
            <div className="mt-3 h-8 w-11 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-600">
              <div className="absolute inset-[3px] rounded-[3px] border border-black/25" />
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-black/25" />
              <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-black/25" />
            </div>

            {/* PAN */}
            <p className="mt-3 whitespace-nowrap font-mono text-lg tracking-[0.12em] text-white">
              {secret ? groupPan(secret.number) : maskedPan(card.last4)}
            </p>

            {/* Bound merchant + limit meter */}
            <div className="mt-auto pt-3">
              {subscriptionName ? (
                <>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-[11px]">
                    <span className="min-w-0 truncate text-gray-300">
                      Locked to <span className="font-semibold text-white">{subscriptionName}</span>
                    </span>
                    <span className="shrink-0 text-gray-400">
                      {money(card.spentThisPeriod, true)} / {limitLabel(card.spendingLimit)}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-black/40">
                    <div
                      className={`h-full rounded-full transition-[width] duration-500 ${
                        spentFraction(card) >= 1 ? 'bg-red-500' : 'bg-green-400'
                      }`}
                      style={{
                        width: `${Math.max(spentFraction(card) * 100, card.spentThisPeriod > 0 ? 3 : 0)}%`,
                      }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-gray-400">
                  Not linked — nothing can charge this card yet.
                </p>
              )}
            </div>

            {/* Holder + expiry */}
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-gray-300">Card Holder</p>
                <p className="truncate text-sm font-medium text-white">{card.cardHolder}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-wider text-gray-300">Expires</p>
                <p className="font-mono text-sm font-medium text-white">
                  {expLabel(card.expMonth, card.expYear)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- back */}
        <div
          className={`absolute inset-0 backface-hidden [transform:rotateY(180deg)] overflow-hidden
                      rounded-2xl shadow-2xl ${skin}`}
        >
          <div className="mt-6 h-10 w-full bg-black" />

          <div className="px-6 pt-5">
            <div className="flex items-center justify-end gap-3">
              <span className="text-[10px] uppercase tracking-wider text-gray-300">CVV</span>
              <span className="rounded bg-white px-3 py-1 font-mono text-sm tracking-widest text-black">
                {secret ? secret.cvc : '•••'}
              </span>
            </div>

            <p className="mt-5 font-mono text-sm tracking-[0.12em] text-gray-200">
              {secret ? groupPan(secret.number) : maskedPan(card.last4)}
            </p>

            <p className="mt-3 max-w-[36ch] text-[11px] leading-relaxed text-gray-400">
              {subscriptionName
                ? `Authorisations are refused unless the merchant is ${subscriptionName}.`
                : 'Link this card to a subscription to give it a merchant and a limit.'}
            </p>

            {fundingLabel && (
              <p className="mt-2 text-[11px] text-gray-500">
                Settles to {fundingLabel} — never shown to the merchant.
              </p>
            )}
          </div>

          <BrandMark type={card.cardType} className="absolute bottom-4 right-6 opacity-20" />
        </div>
      </div>
    </div>
  );
}

function BrandMark({ type, className = '' }: { type: CardType; className?: string }) {
  if (type === 'Mastercard') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <svg width="34" height="22" viewBox="0 0 34 22" aria-hidden="true">
          <circle cx="12" cy="11" r="10" fill="#EB001B" />
          <circle cx="22" cy="11" r="10" fill="#F79E1B" fillOpacity="0.85" />
        </svg>
        <span className="text-xs font-medium text-white">Mastercard</span>
      </div>
    );
  }
  if (type === 'Amex') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="rounded bg-[#2E77BC] px-1.5 py-0.5 text-[10px] font-bold tracking-tight text-white">
          AMEX
        </span>
        <span className="text-xs font-medium text-white">American Express</span>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="font-serif text-lg font-bold italic leading-none tracking-tight text-white">
        VISA
      </span>
    </div>
  );
}
