import * as Clipboard from 'expo-clipboard';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { PhantomCard } from '../components/PhantomCard';
import { Pill } from '../components/Pill';
import { intervalLabel, money } from '../api';
import { radius, space, theme } from '../theme';
import type { CardSecret, MerchantCard, Transaction } from '../types';

interface Props {
  card: MerchantCard;
  transactions: Transaction[];
  secret: CardSecret | null;
  revealed: boolean;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onReveal: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
  onCharge: () => void;
}

export function CardScreen(props: Props) {
  const { card, transactions, secret, revealed, busy, error } = props;
  const pct = Math.min(1, card.spentThisPeriod / card.spendingLimit.amount);

  const copy = async () => {
    if (secret) await Clipboard.setStringAsync(secret.number);
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable onPress={props.onBack} hitSlop={12}>
        <Text style={styles.back}>‹  All cards</Text>
      </Pressable>

      <View style={styles.cardWrap}>
        <PhantomCard card={card} secret={secret} revealed={revealed} />
      </View>

      <View style={styles.revealRow}>
        <Pressable onPress={props.onReveal} hitSlop={8}>
          <Text style={styles.link}>{revealed ? 'Hide details' : 'Reveal card details'}</Text>
        </Pressable>
        {revealed && secret && (
          <Pressable onPress={copy} hitSlop={8}>
            <Text style={styles.link}>Copy number</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <Text style={styles.spend}>
            {money(card.spentThisPeriod)}
            <Text style={styles.spendLimit}>
              {'  of  '}
              {money(card.spendingLimit.amount)} {intervalLabel(card.spendingLimit.interval)}
            </Text>
          </Text>
          <Pill
            label={card.status === 'active' ? 'Active' : 'Paused'}
            tone={card.status === 'active' ? 'accent' : 'paused'}
          />
        </View>

        <View style={styles.meter}>
          <View style={[styles.meterFill, { width: `${Math.round(pct * 100)}%` }]} />
        </View>

        <View style={styles.facts}>
          <Fact label="Merchant lock" value={`Only ${card.merchantName}`} />
          <Fact
            label="Next billing"
            value={`${card.billingCycle} · ${new Date(card.nextBillingDate).toLocaleDateString()}`}
          />
          <Fact
            label="Issued by"
            value={card.source === 'stripe' ? 'Stripe Issuing' : 'Simulated — not Stripe'}
            tone={card.source === 'stripe' ? 'accent' : 'paused'}
          />
        </View>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        label={busy ? 'Working…' : `Simulate a purchase at ${card.merchantName}`}
        onPress={props.onCharge}
        disabled={busy}
        style={{ marginTop: space.lg }}
      />

      <View style={styles.controls}>
        <Button
          label={card.status === 'active' ? 'Pause card' : 'Resume card'}
          variant="secondary"
          onPress={props.onTogglePause}
          disabled={busy}
          style={styles.control}
        />
        <Button
          label="Delete card"
          variant="danger"
          onPress={props.onDelete}
          disabled={busy}
          style={styles.control}
        />
      </View>

      {transactions.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>ACTIVITY</Text>
          {transactions.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.flex}>
                <Text style={styles.txMerchant}>{tx.merchantName}</Text>
                <Text style={styles.txMeta}>
                  {tx.status === 'approved' ? 'Approved' : tx.declineReason} ·{' '}
                  {new Date(tx.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
              <Text style={[styles.txAmount, tx.status === 'declined' && styles.txDeclined]}>
                {money(tx.amount)}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: 'accent' | 'paused' }) {
  const color = tone === 'accent' ? theme.accent : tone === 'paused' ? theme.paused : theme.paper;
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={[styles.factValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingTop: space.xxl, paddingBottom: space.xxl },
  back: { color: theme.muted, fontSize: 15 },
  cardWrap: { marginTop: space.lg },

  revealRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.md },
  link: { color: theme.accent, fontSize: 14, fontWeight: '600' },

  panel: {
    marginTop: space.lg,
    padding: space.md + 2,
    backgroundColor: theme.surface,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: theme.hairline,
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  spend: { color: theme.paper, fontSize: 19, fontWeight: '600', fontVariant: ['tabular-nums'] },
  spendLimit: { color: theme.muted, fontSize: 13, fontWeight: '400' },

  meter: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.hairline,
    marginTop: space.md,
    overflow: 'hidden',
  },
  meterFill: { height: 4, backgroundColor: theme.accent },

  facts: { marginTop: space.md + 2, gap: space.sm + 2 },
  fact: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  factLabel: { color: theme.muted, fontSize: 13 },
  factValue: { fontSize: 13, fontWeight: '600' },

  error: { color: theme.blocked, fontSize: 13, marginTop: space.md },

  controls: { flexDirection: 'row', gap: space.sm + 2, marginTop: space.sm + 2 },
  control: { flex: 1 },

  sectionLabel: {
    color: theme.muted,
    fontSize: 11,
    letterSpacing: 1.6,
    marginTop: space.xxl,
    marginBottom: space.md,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.hairline,
  },
  txMerchant: { color: theme.paper, fontSize: 15 },
  txMeta: { color: theme.muted, fontSize: 12, marginTop: 3 },
  txAmount: { color: theme.paper, fontSize: 15, fontVariant: ['tabular-nums'] },
  txDeclined: { color: theme.blocked, textDecorationLine: 'line-through' },
});
