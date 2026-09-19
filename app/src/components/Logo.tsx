import Svg, { Path, Rect } from 'react-native-svg';
import { theme } from '../theme';

const GHOST =
  'M10 23A14 14 0 0 1 38 23V41Q35.2 47.5 32.4 41Q29.6 36.5 26.8 41Q24 47.5 21.2 41Q18.4 36.5 15.6 41Q12.8 47.5 10 41Z' +
  'M19 24a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z' +
  'M29 24a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z';

interface Props {
  size?: number;
  /** The ghost. */
  color?: string;
  /** The card the ghost is holding. */
  accent?: string;
  /** The surface behind the mark — draws the gap that separates card from ghost. */
  background?: string;
}

export function Logo({
  size = 40,
  color = theme.paper,
  accent = theme.accent,
  background = theme.ink,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d={GHOST} fill={color} fillRule="evenodd" />
      <Rect x={27} y={34} width={31} height={22} rx={6} fill={background} />
      <Rect x={30} y={37} width={25} height={16} rx={3.5} fill={accent} />
      <Rect x={30} y={42} width={25} height={3.5} fill={theme.onAccent} opacity={0.22} />
    </Svg>
  );
}
