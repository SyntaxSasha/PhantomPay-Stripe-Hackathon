import { BrowserRouter, Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import logo from './assets/phantompay.png';
import { PhantomProvider, usePhantom } from './lib/store';
import { Welcome } from './screens/Welcome';
import { Subscriptions } from './screens/Subscriptions';
import { SubscriptionDetails } from './screens/SubscriptionDetails';
import { AddSubscription } from './screens/AddSubscription';
import { VirtualCards } from './screens/VirtualCards';
import { Alerts } from './screens/Alerts';

export default function App() {
  return (
    <PhantomProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </PhantomProvider>
  );
}

function Shell() {
  const { pathname } = useLocation();
  const landing = pathname === '/';

  return (
    <div className="min-h-screen bg-black text-white">
      {!landing && <Nav />}
      <div className={landing ? '' : 'pt-16'}>
        <div key={pathname} className="animate-fade-up">
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/subscriptions/:id" element={<SubscriptionDetails />} />
            <Route path="/add-subscription" element={<AddSubscription />} />
            <Route path="/virtual-cards" element={<VirtualCards />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="*" element={<Subscriptions />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function Nav() {
  const { reset, alerts } = usePhantom();
  const activeAlerts = alerts.filter((a) => a.status === 'active').length;

  const link = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
      isActive ? 'text-white' : 'text-gray-300 hover:text-white'
    }`;

  return (
    <nav className="fixed inset-x-0 top-0 z-50 bg-gray-900/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-2">
          <Link
            to="/subscriptions"
            className="flex shrink-0 items-center gap-0.5 text-lg font-bold text-white sm:text-xl"
          >
            <img src={logo} alt="" className="h-10 w-10 shrink-0 object-contain sm:h-14 sm:w-14" />
            <span className="hidden xs:inline">PhantomPay</span>
          </Link>

          {/* Labels collapse before they can ever collide with the wordmark. */}
          <div className="flex min-w-0 items-center gap-0.5 sm:gap-2">
            <NavLink to="/subscriptions" className={link}>
              <span className="hidden md:inline">Subscriptions</span>
              <span className="md:hidden">Subs</span>
            </NavLink>
            <NavLink to="/virtual-cards" className={link}>
              <span className="hidden md:inline">Virtual Cards</span>
              <span className="md:hidden">Cards</span>
            </NavLink>
            <NavLink to="/alerts" className={link}>
              Alerts
              {activeAlerts > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {activeAlerts}
                </span>
              )}
            </NavLink>
            <button
              onClick={() => void reset()}
              title="Clear every card, subscription and transaction — for running the demo again"
              className="rounded-md px-2 py-2 text-sm font-medium text-gray-400 transition-colors duration-200 hover:text-white sm:px-3"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

    </nav>
  );
}
