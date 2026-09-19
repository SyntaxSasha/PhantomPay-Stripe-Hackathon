import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, SafeAreaView, StatusBar, StyleSheet, View } from 'react-native';
import { api } from './src/api';
import { theme } from './src/theme';
import { HomeScreen } from './src/screens/HomeScreen';
import { CreateScreen } from './src/screens/CreateScreen';
import { CardScreen } from './src/screens/CardScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import { DeletedScreen } from './src/screens/DeletedScreen';
import type { Capabilities, CardSecret, Transaction, VirtualCard } from './src/types';

type Route =
  | { name: 'home' }
  | { name: 'create' }
  | { name: 'card'; id: string }
  | { name: 'result'; transaction: Transaction; card: VirtualCard }
  | { name: 'deleted'; merchantName: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [secret, setSecret] = useState<CardSecret | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fade = useRef(new Animated.Value(1)).current;

  const go = useCallback((next: Route) => setRoute(next), []);

  // Driven off the route itself rather than chained inside go(), so an interrupted
  // transition can never strand a screen at partial opacity mid-demo.
  useEffect(() => {
    fade.setValue(0);
    const anim = Animated.timing(fade, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
    anim.start();
    return () => {
      anim.stop();
      fade.setValue(1);
    };
  }, [route.name, fade]);

  const refresh = useCallback(async () => {
    try {
      const { cards: list, capabilities: caps } = await api.listCards();
      setCards(list);
      setCapabilities(caps);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openCard = useCallback(async (card: VirtualCard) => {
    setSecret(null);
    setRevealed(false);
    setError(null);
    go({ name: 'card', id: card.id });
    try {
      const { transactions: txs } = await api.getCard(card.id);
      setTransactions(txs);
    } catch {
      setTransactions([]);
    }
  }, [go]);

  const current = route.name === 'card' ? cards.find((c) => c.id === route.id) : undefined;

  const handleCreate = async (input: Parameters<typeof api.createCard>[0]) => {
    setBusy(true);
    setError(null);
    try {
      const { card } = await api.createCard(input);
      await refresh();
      setTransactions([]);
      setSecret(null);
      setRevealed(false);
      go({ name: 'card', id: card.id });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleReveal = async () => {
    if (!current) return;
    if (revealed) {
      setRevealed(false);
      return;
    }
    try {
      if (!secret) {
        const { secret: s } = await api.secret(current.id);
        setSecret(s);
      }
      setRevealed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleTogglePause = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await api.setStatus(current.id, current.status === 'active' ? 'paused' : 'active');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await api.deleteCard(current.id);
      const merchantName = current.merchantName;
      await refresh();
      go({ name: 'deleted', merchantName });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCharge = async () => {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      const { transaction, card } = await api.charge(current.id, 1499);
      await refresh();
      setTransactions((prev) => [transaction, ...prev]);
      go({ name: 'result', transaction, card });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.ink} />
      <SafeAreaView style={styles.root}>
        <Animated.View style={[styles.root, { opacity: fade }]}>
          {route.name === 'home' && (
            <HomeScreen
              cards={cards}
              capabilities={capabilities}
              error={error}
              onCreate={() => go({ name: 'create' })}
              onOpen={openCard}
              onRetry={refresh}
            />
          )}

          {route.name === 'create' && (
            <CreateScreen onBack={() => go({ name: 'home' })} onCreate={handleCreate} busy={busy} error={error} />
          )}

          {route.name === 'card' && current && (
            <CardScreen
              card={current}
              transactions={transactions}
              secret={secret}
              revealed={revealed}
              busy={busy}
              error={error}
              onBack={() => go({ name: 'home' })}
              onReveal={handleReveal}
              onTogglePause={handleTogglePause}
              onDelete={handleDelete}
              onCharge={handleCharge}
            />
          )}

          {route.name === 'result' && (
            <ResultScreen
              transaction={route.transaction}
              card={route.card}
              onDone={() => go({ name: 'card', id: route.card.id })}
            />
          )}

          {route.name === 'deleted' && (
            <DeletedScreen merchantName={route.merchantName} onDone={() => go({ name: 'home' })} />
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.ink },
});
