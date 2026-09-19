/**
 * Phantom design tokens.
 *
 * One restrained accent on a near-black base. Import from here — never hardcode
 * a hex value in a screen.
 */

export const neutral = {
  ink: '#08080A',        // app background, the card face
  surface: '#131316',    // elevated surface (sheets, list rows)
  surfaceAlt: '#1B1B1F', // pressed / secondary fill
  hairline: '#26262B',   // 1px borders on dark
  muted: '#6E6E78',      // tertiary text, disabled
  secondary: '#A1A1AC',  // secondary text
  paper: '#FAFAFA',      // light-mode background
  white: '#FFFFFF',
} as const;

export const semantic = {
  approved: '#2FE39B',
  blocked: '#FF4D4D',
  paused: '#FFB020',
} as const;

/** Candidate accents. Exactly one ships. */
export const accents = {
  /** Spectral mint — recommended. Reads premium on black, differentiates from Stripe's violet. */
  spectre: { name: 'Spectre', accent: '#00E5A8', accentDim: '#0B4034', onAccent: '#04130F' },
  /** Iris — Stripe-adjacent violet. Fintech-native, but risks looking like a Stripe template. */
  iris: { name: 'Iris', accent: '#6C5CFF', accentDim: '#1E1A4D', onAccent: '#FFFFFF' },
  /** Ghost ice — near-monochrome periwinkle. Most restrained, least memorable on a projector. */
  ghost: { name: 'Ghost', accent: '#C3CEFF', accentDim: '#23283D', onAccent: '#0B0E1C' },
} as const;

export const ACTIVE_ACCENT = accents.spectre;

export const theme = {
  ...neutral,
  ...semantic,
  accent: ACTIVE_ACCENT.accent,
  accentDim: ACTIVE_ACCENT.accentDim,
  onAccent: ACTIVE_ACCENT.onAccent,
} as const;

export const type = {
  display: { size: 34, weight: '600' as const, letterSpacing: -0.8 },
  title: { size: 22, weight: '600' as const, letterSpacing: -0.4 },
  body: { size: 16, weight: '400' as const, letterSpacing: 0 },
  label: { size: 12, weight: '600' as const, letterSpacing: 1.6 }, // uppercase eyebrows
  mono: { size: 20, weight: '500' as const, letterSpacing: 2 },    // card PAN
} as const;

export const radius = { card: 18, control: 12, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 } as const;
