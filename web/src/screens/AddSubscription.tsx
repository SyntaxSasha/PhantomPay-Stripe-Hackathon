import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { usePhantom } from '../lib/store';
import { today } from '../lib/format';
import type { BillingCycle } from '../types';

const CYCLES: BillingCycle[] = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'];

/** Common ones, so the demo does not turn into a typing exercise. */
const PRESETS = [
  { name: 'Netflix', price: '14.99' },
  { name: 'Spotify', price: '11.99' },
  { name: 'Adobe', price: '59.99' },
  { name: 'Amazon Prime', price: '12.99' },
];

export function AddSubscription() {
  const navigate = useNavigate();
  const { createSubscription } = usePhantom();

  const [form, setForm] = useState({
    name: '',
    price: '',
    billingCycle: 'Monthly' as BillingCycle,
    startDate: today(),
    description: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = form.name.trim().length > 0 && Number(form.price) > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const sub = await createSubscription({
        name: form.name.trim(),
        price: Math.round(Number(form.price) * 100),
        billingCycle: form.billingCycle,
        description: form.description.trim(),
        startDate: form.startDate,
      });
      navigate(`/subscriptions/${sub.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add subscription');
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate('/subscriptions')}
          className="mb-8 text-gray-400 transition-colors duration-200 hover:text-white"
        >
          ← Back to Subscriptions
        </button>

        <div className="panel p-8">
          <h1 className="mb-6 text-3xl font-bold text-white">Add Subscription</h1>

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="space-y-6">
            <div>
              <label htmlFor="name" className="label">
                Name
              </label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Netflix"
                autoComplete="off"
                required
                className="field"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => setForm({ ...form, name: p.name, price: p.price })}
                    className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs
                               text-gray-300 transition-colors duration-200 hover:border-blue-500/50 hover:text-white"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="price" className="label">
                  Price
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    $
                  </span>
                  <input
                    id="price"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="14.99"
                    required
                    className="field pl-8"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="billingCycle" className="label">
                  Billing Cycle
                </label>
                <select
                  id="billingCycle"
                  value={form.billingCycle}
                  onChange={(e) => setForm({ ...form, billingCycle: e.target.value as BillingCycle })}
                  className="field"
                >
                  {CYCLES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="startDate" className="label">
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
                className="field"
              />
            </div>

            <div>
              <label htmlFor="description" className="label">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Streaming service for movies and TV shows"
                className="field resize-none"
              />
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" loading={busy} disabled={!valid} className="px-6 py-3">
                Add Subscription
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="px-6 py-3"
                onClick={() => navigate('/subscriptions')}
              >
                Cancel
              </Button>
            </div>

            <p className="text-xs leading-relaxed text-gray-500">
              You will pick the card that pays for this on the next screen. Until you do, it bills
              your real card.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
