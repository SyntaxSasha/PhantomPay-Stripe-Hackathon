import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { Pill } from '../components/Pill';
import { intervalLabel, money } from '../api';
import { radius, space, theme } from '../theme';
import type { Capabilities, MerchantCard } from '../types';

interface Props {
  cards: MerchantCard[];
  capabilities: Capabilities | null;
  error: string | null;
  onCreate: () => void;
  onOpen: (card: MerchantCard) => void;
  onRetry: () => void;
}

export function HomeScreen({ cards, capabilities, error, onCreate, onOpen, onRetry }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.brand}>
        <Logo size={34} />
        <Text style={styles.wordmark}>PHANTOM</Text>
      </View>
      <Text style={styles.tagline}>Your payment identity, under your control.</Text>

      {capabilities?.mode === 'simulated' && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Simulated mode</Text>
          <Text style={styles.bannerBody}>
            {capabilities.notes[0] ?? 'Stripe Issuing is not available on this account.'} Cards below are not
            Stripe-issued and are labelled as simulated.
          </Text>
        </View>
      )}

      {error && (
        <Pressable style={[styles.banner, styles.bannerError]} onPress={onRetry}>
          <Text style={styles.bannerTitle}>Can't reach the Phantom API</Text>
          <Text style={styles.bannerBody}>{error} — tap to retry.</Text>
        </Pressable>
      )}

      <Button label="+  Create protected card" onPress={onCreate} style={{ marginTop: space.xl }} />

      <Text style={styles.sectionLabel}>ACTIVE CARDS</Text>

      {cards.length === 0 && !error && (
        <Text style={styles.empty}>No cards yet. Every merchant you pay should get its own.</Text>
      )}

      {cards.map((card) => (
        <Pressable key={card.id} style={styles.row} onPress={() => onOpen(card)}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowMerchant}>{card.merchantName}</Text>
            <Text style={styles.rowMeta}>
              {money(card.spendingLimit.amount)} {intervalLabel(card.spendingLimit.interval)} · •••• {card.last4}
            </Text>
          </View>
          <Pill
            label={card.status === 'active' ? 'Active' : 'Paused'}
            tone={card.status === 'active' ? 'accent' : 'paused'}
          />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingTop: space.xxl, paddingBottom: space.xxl },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  wordmark: { color: theme.paper, fontSize: 24, fontWeight: '600', letterSpacing: 6 },
  tagline: { color: theme.muted, fontSize: 15, marginTop: space.sm + 2 },

  banner: {
    marginTop: space.lg,
    padding: space.md,
    borderRadius: radius.control,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.paused,
  },
  bannerError: { borderColor: theme.blocked },
  bannerTitle: { color: theme.paper, fontSize: 14, fontWeight: '600', marginBottom: 4 },
  bannerBody: { color: theme.secondary, fontSize: 13, lineHeight: 19 },

  sectionLabel: {
    color: theme.muted,
    fontSize: 11,
    letterSpacing: 1.6,
    marginTop: space.xxl,
    marginBottom: space.md,
  },
  empty: { color: theme.muted, fontSize: 14, lineHeight: 21 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.md + 2,
    paddingHorizontal: space.md,
    backgroundColor: theme.surface,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: theme.hairline,
    marginBottom: space.sm + 2,
  },
  rowLeft: { gap: 4, flex: 1 },
  rowMerchant: { color: theme.paper, fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  rowMeta: { color: theme.muted, fontSize: 13 },
});
