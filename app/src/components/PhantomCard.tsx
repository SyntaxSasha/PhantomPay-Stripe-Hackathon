import { StyleSheet, Text, View } from 'react-native';
import { Logo } from './Logo';
import { radius, space, theme } from '../theme';
import type { CardSecret, MerchantCard } from '../types';

const group = (s: string) => s.replace(/(.{4})/g, '$1 ').trim();

interface Props {
  card: MerchantCard;
  secret?: CardSecret | null;
  revealed?: boolean;
}

export function PhantomCard({ card, secret, revealed }: Props) {
  const number = revealed && secret ? group(secret.number) : `•••• •••• •••• ${card.last4}`;
  const cvc = revealed && secret ? secret.cvc : '•••';
  const dimmed = card.status !== 'active';

  return (
    <View style={[styles.card, dimmed && styles.dimmed]}>
      <View style={styles.watermark} pointerEvents="none">
        <Logo size={190} color={theme.white} accent={theme.white} background={theme.surface} />
      </View>

      <View style={styles.header}>
        <Text style={styles.eyebrow}>PHANTOM VIRTUAL CARD</Text>
        <Logo size={22} background={theme.surface} />
      </View>

      <Text style={styles.merchant}>{card.merchantName}</Text>

      <Text style={styles.number}>{number}</Text>

      <View style={styles.footer}>
        <View>
          <Text style={styles.label}>EXP</Text>
          <Text style={styles.value}>
            {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}
          </Text>
        </View>
        <View>
          <Text style={styles.label}>CVC</Text>
          <Text style={styles.value}>{cvc}</Text>
        </View>
        <View style={styles.brandSlot}>
          <Text style={styles.label}>{card.brand.toUpperCase()}</Text>
          <Text style={[styles.value, { color: card.source === 'stripe' ? theme.accent : theme.paused }]}>
            {card.source === 'stripe' ? 'Stripe Issuing' : 'Simulated'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: theme.hairline,
    padding: space.lg,
    overflow: 'hidden',
    aspectRatio: 1.586,
    justifyContent: 'space-between',
  },
  dimmed: { opacity: 0.45 },
  watermark: { position: 'absolute', right: -58, bottom: -52, opacity: 0.04 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: theme.accent, fontSize: 11, fontWeight: '600', letterSpacing: 1.6 },
  merchant: { color: theme.paper, fontSize: 24, fontWeight: '600', letterSpacing: -0.4 },
  number: {
    color: theme.paper,
    fontSize: 21,
    letterSpacing: 2.4,
    fontVariant: ['tabular-nums'],
  },
  footer: { flexDirection: 'row', gap: space.xl, alignItems: 'flex-end' },
  brandSlot: { marginLeft: 'auto', alignItems: 'flex-end' },
  label: { color: theme.muted, fontSize: 10, letterSpacing: 1.4, marginBottom: 3 },
  value: { color: theme.paper, fontSize: 14, fontVariant: ['tabular-nums'] },
});
