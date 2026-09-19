import { StyleSheet, Text, View } from 'react-native';
import { radius, theme } from '../theme';

export function Pill({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'paused' | 'blocked' | 'muted' }) {
  const color =
    tone === 'accent' ? theme.accent : tone === 'paused' ? theme.paused : tone === 'blocked' ? theme.blocked : theme.muted;

  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6 },
});
