import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { space, theme } from '../theme';

export function DeletedScreen({ merchantName, onDone }: { merchantName: string; onDone: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [fade]);

  return (
    <Animated.View style={[styles.wrap, { opacity: fade }]}>
      <View style={styles.ghost}>
        <Logo size={64} color={theme.hairline} accent={theme.hairline} />
      </View>

      <Text style={styles.headline}>CARD DELETED</Text>
      <Text style={styles.body}>
        {merchantName} still has the number. Future charges on it cannot be authorized.
      </Text>
      <Text style={styles.footnote}>
        This blocks the payment credential. It does not cancel your agreement with the merchant.
      </Text>

      <Button label="Back to cards" onPress={onDone} style={styles.done} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xl },
  ghost: { opacity: 0.9 },
  headline: {
    color: theme.paper,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 2.4,
    marginTop: space.xl,
  },
  body: {
    color: theme.secondary,
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
