import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button } from '../components/Button';
import { radius, space, theme } from '../theme';
import type { LimitInterval } from '../types';

const QUICK = ['Netflix', 'Amazon', 'Adobe', 'Random website'];

const INTERVALS: { label: string; value: LimitInterval }[] = [
  { label: 'Per month', value: 'monthly' },
  { label: 'One purchase', value: 'per_authorization' },
];

const EXPIRIES: { label: string; value: number | null }[] = [
  { label: '30 days', value: 30 },
  { label: '1 year', value: 365 },
  { label: 'No expiry', value: null },
];

interface Props {
  onBack: () => void;
  onCreate: (input: {
    merchantName: string;
    limitAmount: number;
    interval: LimitInterval;
    expiresInDays: number | null;
    merchantLocked: boolean;
  }) => void;
  busy: boolean;
  error: string | null;
}

export function CreateScreen({ onBack, onCreate, busy, error }: Props) {
  const [merchant, setMerchant] = useState('');
  const [limit, setLimit] = useState('20');
  const [interval, setInterval] = useState<LimitInterval>('monthly');
  const [expiry, setExpiry] = useState<number | null>(30);
  const [locked, setLocked] = useState(true);
  const [touched, setTouched] = useState(false);

  const amount = Math.round(parseFloat(limit.replace(/[^0-9.]/g, '')) * 100);
  const merchantValid = merchant.trim().length > 0;
  const amountValid = Number.isFinite(amount) && amount > 0;

  const submit = () => {
    setTouched(true);
    if (!merchantValid || !amountValid) return;
    onCreate({
      merchantName: merchant.trim(),
      limitAmount: amount,
      interval,
      expiresInDays: expiry,
      merchantLocked: locked,
    });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>Cancel</Text>
        </Pressable>

        <Text style={styles.title}>Create protected card</Text>

        <Text style={styles.label}>MERCHANT</Text>
        <TextInput
          value={merchant}
          onChangeText={(t) => {
            setMerchant(t);
            setTouched(false);
          }}
          placeholder="Where will this card be used?"
          placeholderTextColor={theme.muted}
          style={styles.input}
          autoCapitalize="words"
        />
        {touched && !merchantValid && <Text style={styles.error}>Name the merchant first</Text>}

        <View style={styles.chips}>
          {QUICK.map((name) => (
            <Pressable
              key={name}
              onPress={() => {
                setMerchant(name);
                setTouched(false);
              }}
              style={[styles.chip, merchant === name && styles.chipOn]}
            >
              <Text style={[styles.chipText, merchant === name && styles.chipTextOn]}>{name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>SPENDING LIMIT</Text>
        <View style={styles.amountRow}>
          <Text style={styles.currency}>$</Text>
          <TextInput
            value={limit}
            onChangeText={(t) => {
              setLimit(t);
              setTouched(false);
            }}
            keyboardType="decimal-pad"
            style={[styles.input, styles.amountInput]}
          />
        </View>
        {touched && !amountValid && <Text style={styles.error}>Enter an amount above zero</Text>}

        <View style={styles.segment}>
          {INTERVALS.map((opt) => (
            <Pressable
              key={opt.value}
              onPress={() => setInterval(opt.value)}
              style={[styles.segmentItem, interval === opt.value && styles.segmentOn]}
            >
              <Text style={[styles.segmentText, interval === opt.value && styles.segmentTextOn]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>EXPIRATION</Text>
        <View style={styles.segment}>
          {EXPIRIES.map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() => setExpiry(opt.value)}
              style={[styles.segmentItem, expiry === opt.value && styles.segmentOn]}
            >
              <Text style={[styles.segmentText, expiry === opt.value && styles.segmentTextOn]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text style={styles.switchTitle}>Lock to this merchant</Text>
            <Text style={styles.switchBody}>Any other merchant presenting this card is declined.</Text>
          </View>
          <Switch
            value={locked}
            onValueChange={setLocked}
            trackColor={{ false: theme.hairline, true: theme.accentDim }}
            thumbColor={locked ? theme.accent : theme.muted}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          label={busy ? 'Creating…' : 'Create card'}
          onPress={submit}
          disabled={busy}
          style={{ marginTop: space.xl }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: space.lg, paddingTop: space.xxl, paddingBottom: space.xxl },
  back: { color: theme.muted, fontSize: 15 },
  title: { color: theme.paper, fontSize: 30, fontWeight: '600', letterSpacing: -0.8, marginTop: space.lg },

  label: { color: theme.muted, fontSize: 11, letterSpacing: 1.6, marginTop: space.xl, marginBottom: space.sm },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.hairline,
    borderRadius: radius.control,
    paddingHorizontal: space.md,
    height: 54,
    color: theme.paper,
    fontSize: 17,
  },
  error: { color: theme.blocked, fontSize: 13, marginTop: space.sm },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm + 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.hairline,
    backgroundColor: theme.surface,
  },
  chipOn: { borderColor: theme.accent, backgroundColor: theme.accentDim },
  chipText: { color: theme.secondary, fontSize: 13 },
  chipTextOn: { color: theme.accent },

  amountRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  currency: { color: theme.paper, fontSize: 22, fontWeight: '600' },
  amountInput: { flex: 1, fontSize: 22, fontVariant: ['tabular-nums'] },

  segment: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.md,
  },
  segmentItem: {
    flex: 1,
    height: 46,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: theme.hairline,
    backgroundColor: theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentOn: { borderColor: theme.accent, backgroundColor: theme.accentDim },
  segmentText: { color: theme.secondary, fontSize: 14 },
  segmentTextOn: { color: theme.accent, fontWeight: '600' },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.xl,
    padding: space.md,
    backgroundColor: theme.surface,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: theme.hairline,
  },
  switchTitle: { color: theme.paper, fontSize: 15, fontWeight: '600' },
  switchBody: { color: theme.muted, fontSize: 13, marginTop: 3, lineHeight: 18 },
});
