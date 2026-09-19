import { Link } from 'react-router-dom';
import logo from '../assets/phantompay.png';

export function Welcome() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-6">
          <img src={logo} alt="" className="mx-auto h-28 w-28 object-contain" />

          <div className="relative">
            <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 opacity-30 blur" />
            <h1 className="relative text-6xl font-bold text-white">PhantomPay</h1>
          </div>

          <p className="text-2xl font-light text-gray-300">
            Manage all your subscriptions with one card.
          </p>
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-gray-500">
            Except it is never one card. Every subscription gets its own, in your name, with its
            own limit — so the merchant never holds the card in your wallet.
          </p>
        </div>

        <div className="mt-12 space-y-6">
          <Link
            to="/virtual-cards"
            className="group relative flex transform justify-center rounded-xl border border-transparent
                       bg-gradient-to-r from-blue-500 to-purple-600 px-8 py-4 text-lg font-medium
                       text-white shadow-lg transition-all duration-200 hover:scale-105
                       hover:from-blue-600 hover:to-purple-700 hover:shadow-xl"
          >
            <span
              className="absolute inset-0 h-full w-full translate-x-1 translate-y-1 transform rounded-xl
                         bg-gradient-to-r from-blue-600 to-purple-700 transition duration-200 ease-out
                         group-hover:-translate-x-0 group-hover:-translate-y-0"
            />
            <span className="relative">Get Started</span>
          </Link>

          <Link
            to="/subscriptions"
            className="group relative flex transform justify-center rounded-xl border border-gray-700
                       bg-gray-800 px-8 py-4 text-lg font-medium text-white shadow-lg
                       transition-all duration-200 hover:scale-105 hover:bg-gray-700 hover:shadow-xl"
          >
            <span
              className="absolute inset-0 h-full w-full translate-x-1 translate-y-1 transform rounded-xl
                         bg-gray-700 transition duration-200 ease-out group-hover:-translate-x-0
                         group-hover:-translate-y-0"
            />
            <span className="relative">My Subscriptions</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
