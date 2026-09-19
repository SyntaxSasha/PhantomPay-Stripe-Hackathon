import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { usePhantom } from '../lib/store';
import { cycleLabel, dateLabel, money } from '../lib/format';

export function Subscriptions() {
  const navigate = useNavigate();
  const { subscriptions, cardFor, loading, error } = usePhantom();

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Your Subscriptions</h1>
            <p className="mt-2 text-gray-400">
              Link each one to its own card. The merchant never sees the others.
            </p>
          </div>
          <div className="flex gap-4">
            <Button onClick={() => navigate('/add-subscription')} className="px-4 py-2">
              Add Subscription
            </Button>
            <Button variant="secondary" onClick={() => navigate('/virtual-cards')} className="px-4 py-2">
              Virtual Cards
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border border-gray-800/50 bg-gray-900/50" />
            ))}
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="panel px-6 py-16 text-center">
            <p className="text-lg font-medium text-white">No subscriptions yet.</p>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-400">
              Add one, then give it a card of its own. Deleting that card ends the payment
              relationship without touching anything else you pay for.
            </p>
            <Button onClick={() => navigate('/add-subscription')} className="mt-6 px-6 py-3">
              Add Subscription
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {subscriptions.map((sub) => {
              const card = cardFor(sub.id);
              return (
                <div
                  key={sub.id}
                  onClick={() => navigate(`/subscriptions/${sub.id}`)}
                  className="group relative cursor-pointer rounded-2xl border border-gray-800/50 bg-gray-900/50
                             p-6 shadow-2xl backdrop-blur-sm transition-all duration-300
                             hover:scale-105 hover:border-blue-500/50 hover:shadow-blue-500/20"
                >
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/0 to-purple-600/0 opacity-0 transition-opacity duration-300 group-hover:opacity-10" />

                  <div className="relative">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-white transition-colors duration-300 group-hover:text-blue-400">
                        {sub.name}
                      </h3>
                      <span className="rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-400">
                        {sub.status}
                      </span>
                    </div>

                    <p className="mb-2 text-sm text-gray-400">
                      Next billing: {dateLabel(sub.nextBillingDate)}
                    </p>

                    {/* Which credential pays this — the whole point of the app. */}
                    <p className="mb-4 text-sm">
                      {card ? (
                        <span className="text-blue-400">
                          Phantom card •••• {card.last4}
                          {card.status === 'paused' && (
                            <span className="ml-2 text-yellow-400">(paused)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-500">No Phantom card linked</span>
                      )}
                    </p>

                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-white transition-colors duration-300 group-hover:text-blue-400">
                        {money(sub.price, true)}
                      </p>
                      <span className="text-sm text-gray-400">/{cycleLabel(sub.billingCycle)}</span>
                    </div>

                    <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 transition-all duration-300 group-hover:translate-x-2 group-hover:opacity-100">
                      <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
