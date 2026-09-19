import { useEffect, type ReactNode } from 'react';
import { Button } from './Button';
import { money } from '../lib/format';
import type { ChargeResult } from '../types';

export function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex animate-fade-up items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div onClick={(e) => e.stopPropagation()} className="flex w-full justify-center">
        {children}
      </div>
    </div>
  );
}

/**
 * The payment result. Approved or declined, the sentence underneath is the point
 * of the whole product, so it carries the weight rather than the colour.
 */
export function ResultOverlay({
  result,
  onClose,
}: {
  result: ChargeResult;
  onClose: () => void;
}) {
  const { approved, transaction: tx } = result;

  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-md animate-pop-in text-center">
        <div className="relative mx-auto h-20 w-20">
          {approved && (
            <span className="absolute inset-0 animate-pulse-ring rounded-full border-2 border-green-400/60" />
          )}
          <div
            className={`relative flex h-20 w-20 animate-draw-ring items-center justify-center
                        rounded-full border-2 ${
                          approved
                            ? 'border-green-400 bg-green-500/10 text-green-400'
                            : 'border-red-500 bg-red-500/10 text-red-500'
                        }`}
          >
            {approved ? <CheckIcon /> : <CrossIcon />}
          </div>
        </div>

        <h2 className="mt-6 text-2xl font-bold text-white">
          {approved ? 'Payment approved' : 'Payment declined'}
        </h2>

        <p className="mt-5 text-5xl font-bold tracking-tight text-white">
          {money(tx.amount, true)}
        </p>
        <p className="mt-1 text-sm text-gray-400">{tx.merchantName}</p>

        {approved ? (
          <div className="mt-7 space-y-2">
            <p className="text-sm text-gray-400">Paid with a PhantomPay virtual card.</p>
            <p className="text-base font-medium text-white">
              Your primary card was not given to the merchant.
            </p>
          </div>
        ) : (
          <div className="mt-7 space-y-2">
            <p className="text-sm text-red-400">{tx.declineReason}</p>
            <p className="text-base font-medium text-white">
              The charge never reached your real card.
            </p>
          </div>
        )}

        <Button variant="secondary" className="mt-8 w-full py-3" onClick={onClose}>
          Done
        </Button>
      </div>
    </Overlay>
  );
}

function CheckIcon() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
