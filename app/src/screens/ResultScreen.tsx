import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { money } from '../api';
import { space, theme } from '../theme';
import type { Transaction, VirtualCard } from '../types';

interface Props {
  transaction: Transaction;
  card: VirtualCard;
  onDone: () => void;
}

export function ResultScreen({ transaction, card, onDone }: Props) {
  const approved = transaction.status === 'approved';
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pop, {
      toValue: 1,
      duration: 340,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [pop]);

  // Approved stays paper-white on purpose: mint is the brand signal, and a mint check next to
  // a mint button reads as decoration rather than as a result. Declines get the only red here.
  const color = approved ? theme.paper : theme.blocked;

  return (
    <View style={styles.wrap}>
      <Animated.View
        style={{
          opacity: pop,
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
        }}
      >
        <View style={[styles.glyph, { borderColor: color }]}>
          <Svg width={34} height={34} viewBox="0 0 24 24">
            <Path
              d={approved ? 'M4 12.5 9.5 18 20 6.5' : 'M6 6l12 12M18 6L6 18'}
              stroke={color}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </View>
      </Animated.View>

      <Text style={[styles.headline, { color }]}>
        {approved ? 'Payment approved' : 'Payment declined'}
      </Text>

      <Text style={styles.merchant}>{transaction.merchantName}</Text>
      <Text style={styles.amount}>{money(transaction.amount)}</Text>

      {approved ? (
        <>
          <View style={styles.paidWith}>
            <Logo size={20} />
            <Text style={styles.paidWithText}>Paid with a Phantom virtual card</Text>
          </View>
          <Text style={styles.punchline}>Your primary card was not given to the merchant.</Text>
          <Text style={styles.footnote}>
            {transaction.source === 'stripe'
              ? `Authorized through Stripe Issuing on card •••• ${card.last4}.`
              : `Simulated authorization on card •••• ${card.last4}. Not a Stripe transaction.`}
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.punchline}>{transaction.declineReason}</Text>
          <Text style={styles.footnote}>
            The merchant holds this credential and it still bought them nothing.
          </Text>
        </>
      )}

      <Button label="Done" onPress={onDone} style={styles.done} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  glyph: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: { fontSize: 15, fontWeight: '600', letterSpacing: 1.4, marginTop: space.lg },
  merchant: { color: theme.paper, fontSize: 26, fontWeight: '600', marginTop: space.xl, letterSpacing: -0.4 },
  amount: {
    color: theme.paper,
    fontSize: 52,
    fontWeight: '600',
    letterSpacing: -1.6,
    marginTop: space.xs,
    fontVariant: ['tabular-nums'],
  },
  paidWith: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xxl },
  paidWithText: { color: theme.secondary, fontSize: 15 },
  punchline: {
    color: theme.paper,
    fontSize: 17,
    textAlign: 'center',
    marginTop: space.lg,
    lineHeight: 25,
    maxWidth: 300,
  },
  footnote: {
    color: theme.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: space.md,
    lineHeight: 18,
    maxWidth: 300,
  },
  done: { alignSelf: 'stretch', marginTop: space.xxl },
});
