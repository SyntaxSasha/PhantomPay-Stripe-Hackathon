import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  api,
  type AddPhysicalCardInput,
  type CreateCardInput,
  type CreateSubscriptionInput,
} from './api';
import type {
  Capabilities,
  ChargeResult,
  FraudAlert,
  PhysicalCard,
  Subscription,
  Transaction,
  VirtualCard,
} from '../types';

interface PhantomState {
  cards: VirtualCard[];
  physicalCards: PhysicalCard[];
  subscriptions: Subscription[];
  transactions: Transaction[];
  alerts: FraudAlert[];
  capabilities: Capabilities | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  cardFor: (subscriptionId: string) => VirtualCard | undefined;
  subscriptionFor: (cardId: string) => Subscription | undefined;
  historyFor: (cardId: string) => Transaction[];
  createCard: (input: CreateCardInput) => Promise<VirtualCard>;
  setCardStatus: (id: string, status: 'active' | 'paused') => Promise<void>;
  makeDefault: (id: string) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  createSubscription: (input: CreateSubscriptionInput) => Promise<Subscription>;
  deleteSubscription: (id: string) => Promise<void>;
  link: (subscriptionId: string, cardId: string | null) => Promise<void>;
  charge: (subscriptionId: string, amount?: number) => Promise<ChargeResult>;
  resolveAlert: (id: string) => Promise<void>;
  fundingFor: (cardId: string) => PhysicalCard | undefined;
  setFunding: (cardId: string, physicalCardId: string | null) => Promise<void>;
  addPhysicalCard: (input: AddPhysicalCardInput) => Promise<void>;
  removePhysicalCard: (id: string) => Promise<void>;
  reset: () => Promise<void>;
}

const Ctx = createContext<PhantomState | null>(null);

export function PhantomProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [physicalCards, setPhysicalCards] = useState<PhysicalCard[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const state = await api.state();
      setCards(state.cards);
      setSubscriptions(state.subscriptions);
      setTransactions(state.transactions);
      setAlerts(state.alerts ?? []);
      setPhysicalCards(state.physicalCards ?? []);
      setCapabilities(state.capabilities);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message} — is the Phantom API running on :4242?`
          : 'Could not reach the Phantom API',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<PhantomState>(() => {
    const liveCards = cards.filter((c) => c.status !== 'deleted');

    return {
      cards: liveCards,
      physicalCards,
      subscriptions,
      transactions,
      alerts,
      capabilities,
      loading,
      error,

      cardFor: (subscriptionId) =>
        liveCards.find((c) => c.linkedSubscriptionId === subscriptionId),
      subscriptionFor: (cardId) => subscriptions.find((s) => s.virtualCardId === cardId),
      historyFor: (cardId) => transactions.filter((t) => t.cardId === cardId),
      fundingFor: (cardId) => {
        const card = liveCards.find((c) => c.id === cardId);
        return physicalCards.find((p) => p.id === card?.fundingCardId);
      },

      refresh,

      createCard: async (input) => {
        const { card } = await api.createCard(input);
        await refresh();
        return card;
      },
      setCardStatus: async (id, status) => {
        await api.setCardStatus(id, status);
        await refresh();
      },
      makeDefault: async (id) => {
        await api.makeDefault(id);
        await refresh();
      },
      deleteCard: async (id) => {
        await api.deleteCard(id);
        await refresh();
      },
      createSubscription: async (input) => {
        const { subscription } = await api.createSubscription(input);
        await refresh();
        return subscription;
      },
      deleteSubscription: async (id) => {
        await api.deleteSubscription(id);
        await refresh();
      },
      link: async (subscriptionId, cardId) => {
        await api.link(subscriptionId, cardId);
        await refresh();
      },
      charge: async (subscriptionId, amount) => {
        const result = await api.charge(subscriptionId, amount);
        await refresh();
        return result;
      },
      setFunding: async (cardId, physicalCardId) => {
        await api.setFunding(cardId, physicalCardId);
        await refresh();
      },
      addPhysicalCard: async (input) => {
        await api.addPhysicalCard(input);
        await refresh();
      },
      removePhysicalCard: async (id) => {
        await api.removePhysicalCard(id);
        await refresh();
      },
      resolveAlert: async (id) => {
        const { alerts: next } = await api.resolveAlert(id);
        setAlerts(next);
      },
      reset: async () => {
        await api.reset();
        await refresh();
      },
    };
  }, [
    cards,
    physicalCards,
    subscriptions,
    transactions,
    alerts,
    capabilities,
    loading,
    error,
    refresh,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePhantom(): PhantomState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePhantom must be used inside PhantomProvider');
  return ctx;
}
