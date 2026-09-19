import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { radius, space, theme } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ label, onPress, variant = 'primary', disabled, style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPressIn={() => spring(0.97)}
        onPressOut={() => spring(1)}
        onPress={onPress}
        disabled={disabled}
        style={[styles.base, styles[variant], disabled && styles.disabled]}
      >
        <Text style={[styles.label, variant === 'primary' ? styles.labelOnAccent : styles.labelOnDark]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  primary: { backgroundColor: theme.accent },
  secondary: { backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.hairline },
  danger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.hairline },
  disabled: { opacity: 0.4 },
  label: { fontSize: 16, fontWeight: '600', letterSpacing: -0.2 },
  labelOnAccent: { color: theme.onAccent },
  labelOnDark: { color: theme.paper },
});
