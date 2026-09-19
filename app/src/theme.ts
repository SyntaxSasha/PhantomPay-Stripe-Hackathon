/** Mirrors ../../brand/tokens.ts. Keep the two in sync by hand — it is four colours. */
export const theme = {
  ink: '#08080A',
  surface: '#131316',
  surfaceAlt: '#1B1B1F',
  hairline: '#26262B',
  muted: '#6E6E78',
  secondary: '#A1A1AC',
  paper: '#FAFAFA',
  white: '#FFFFFF',

  accent: '#00E5A8',
  accentDim: '#0B4034',
  onAccent: '#04130F',

  approved: '#2FE39B',
  blocked: '#FF4D4D',
  paused: '#FFB020',
} as const;

export const radius = { card: 20, control: 14, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;

export const mono = {
  fontFamily: undefined as string | undefined,
  fontVariant: ['tabular-nums'] as const,
};
