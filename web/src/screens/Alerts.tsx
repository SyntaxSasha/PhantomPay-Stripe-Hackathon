import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { usePhantom } from '../lib/store';
import { dateLabel, timeLabel } from '../lib/format';
import type { AlertSeverity, AlertType, FraudAlert } from '../types';

const SEVERITY: Record<AlertSeverity, { chip: string; rail: string; label: string }> = {
  high: { chip: 'bg-red-500/20 text-red-400', rail: 'bg-red-500', label: 'High' },
  medium: { chip: 'bg-yellow-500/20 text-yellow-400', rail: 'bg-yellow-500', label: 'Medium' },
  low: { chip: 'bg-blue-500/20 text-blue-400', rail: 'bg-blue-500', label: 'Low' },
};

const TYPE_LABEL: Record<AlertType, string> = {
  blocked_charge: 'Blocked charge',
  suspicious_transaction: 'Suspicious transaction',
  unusual_location: 'Unusual location',
  multiple_attempts: 'Multiple attempts',
};

export function Alerts() {
  const navigate = useNavigate();
  const { alerts, cards, subscriptionFor, resolveAlert, loading } = usePhantom();
  const [filter, setFilter] = useState<'active' | 'all'>('active');
  const [busy, setBusy] = useState<string | null>(null);

  const shown = filter === 'active' ? alerts.filter((a) => a.status === 'active') : alerts;
  const active = alerts.filter((a) => a.status === 'active');
  const blocked = alerts.filter((a) => a.type === 'blocked_charge').length;

  async function resolve(id: string) {
    setBusy(id);
    try {
      await resolveAlert(id);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Security Alerts</h1>
            <p className="mt-2 text-gray-400">
              Every attempt a card refuses is recorded here — with the card it was aimed at and the
              reason it did not go through.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/virtual-cards')} className="px-4 py-2">
            Virtual Cards
          </Button>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Stat label="Open alerts" value={active.length} tone={active.length > 0 ? 'red' : 'green'} />
          <Stat label="Charges refused" value={blocked} tone="blue" />
          <Stat label="Cards monitored" value={cards.length} tone="neutral" />
        </div>

        <div className="mb-6 flex gap-2">
          {(['active', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                filter === f
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {f === 'active' ? `Open (${active.length})` : `All (${alerts.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-gray-800/50 bg-gray-900/50" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="panel px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-green-400 text-green-400">
              <ShieldIcon />
            </div>
            <p className="text-lg font-medium text-white">
              {alerts.length === 0 ? 'Nothing to report.' : 'All clear.'}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-400">
              {cards.length === 0
                ? 'Create a card and monitoring starts with it.'
                : 'No open alerts on any of your cards.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {shown.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                cardLast4={cards.find((c) => c.id === alert.cardId)?.last4}
                merchant={subscriptionFor(alert.cardId)?.name}
                busy={busy === alert.id}
                onResolve={() => void resolve(alert.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AlertRow({
  alert,
  cardLast4,
  merchant,
  busy,
  onResolve,
}: {
  alert: FraudAlert;
  cardLast4?: string;
  merchant?: string;
  busy: boolean;
  onResolve: () => void;
}) {
  const sev = SEVERITY[alert.severity];
  const resolved = alert.status === 'resolved';

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-gray-800/50 bg-gray-900/50
                  p-6 shadow-2xl backdrop-blur-sm transition-all duration-300
                  hover:border-gray-700 ${resolved ? 'opacity-55' : ''}`}
    >
      {/* Severity rail down the left edge. */}
      <div className={`absolute inset-y-0 left-0 w-1 ${resolved ? 'bg-gray-700' : sev.rail}`} />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${sev.chip}`}>
              {sev.label}
            </span>
            <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-300">
              {TYPE_LABEL[alert.type]}
            </span>
            {cardLast4 && (
              <span className="text-xs text-gray-500">card •••• {cardLast4}</span>
            )}
            {merchant && <span className="text-xs text-gray-500">· {merchant}</span>}
            {resolved && (
              <span className="rounded-full bg-green-500/20 px-3 py-1 text-xs text-green-400">
                Resolved
              </span>
            )}
          </div>

          <h3 className="text-lg font-semibold text-white">{alert.title}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-400">
            {alert.description}
          </p>
          <p className="mt-3 text-xs text-gray-500">
            {dateLabel(alert.date)} at {timeLabel(alert.date)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* The reassuring half: the money never moved. */}
          <span className="hidden items-center gap-1.5 text-xs text-green-400 sm:flex">
            <ShieldIcon size={14} />
            Card protected
          </span>
          {!resolved && (
            <Button variant="secondary" onClick={onResolve} loading={busy}>
              Dismiss
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'red' | 'green' | 'blue' | 'neutral';
}) {
  const colour = {
    red: 'text-red-400',
    green: 'text-green-400',
    blue: 'text-blue-400',
    neutral: 'text-white',
  }[tone];

  return (
    <div className="rounded-2xl border border-gray-800/50 bg-gray-900/50 p-6 shadow-2xl backdrop-blur-sm">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${colour}`}>{value}</p>
    </div>
  );
}

function ShieldIcon({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
