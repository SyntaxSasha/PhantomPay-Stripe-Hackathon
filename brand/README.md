# Phantom brand

Shipping: **the ghost mark + Spectre mint.** The app renders the mark from
[app/src/components/Logo.tsx](../app/src/components/Logo.tsx), not from these SVGs — change both
if you change the geometry.

## The mark

A ghost holding a credit card. The ghost is the product name; the card it holds is the accent,
and it is the only coloured thing in the mark. A gap is cut out of the ghost where the card
overlaps, so the card always reads as held *in front* rather than printed on the body.

| File | Use |
|---|---|
| [mark-ghost.svg](mark-ghost.svg) | Primary. Two-tone, mint card. |
| [mark-ghost-mono.svg](mark-ghost-mono.svg) | One colour, card outlined. Favicon, 20px UI, engraving, anywhere the accent can't go. |

The gap is drawn with a `<mask>` in the SVGs and with a background-coloured rect in the RN
component, because `react-native-svg` masks are less predictable than a solid rect. The RN
`Logo` takes a `background` prop for exactly this — pass the surface it sits on, or the gap will
be the wrong colour.

### Alternates, not shipping
[mark-phi.svg](mark-phi.svg) · [mark-stack.svg](mark-stack.svg) · [mark-void.svg](mark-void.svg) ·
[mark-fanout.svg](mark-fanout.svg)

### Usage
- Minimum size 20px; below that the eyes close up — use the mono variant.
- Clear space on all sides = 25% of the mark's height.
- Never recolour the ghost and the card independently of the pairs below: paper ghost + mint
  card on ink, or ink ghost + mint card on paper.
- Don't outline it, don't put it in a circle, don't animate the eyes.

## Wordmark

`PHANTOM`, uppercase, weight 600, letter-spacing ~0.25em, set in the app's sans. The
letterspacing is what makes it a wordmark — there is no custom typeface. Tagline
`Your payment identity, under your control.` in `muted`, never above 15px.

## Colour

See [tokens.ts](tokens.ts); the app mirrors it in
[app/src/theme.ts](../app/src/theme.ts).

```
ink        #08080A   app background, the card face
surface    #131316   sheets, list rows, the hero card
hairline   #26262B   1px borders on dark
muted      #6E6E78   tertiary text
secondary  #A1A1AC   secondary text
paper      #FAFAFA   primary text on ink
accent     #00E5A8   Spectre mint
```

Semantic: `blocked #FF4D4D`, `paused #FFB020`. There is an `approved #2FE39B` in the tokens but
the UI deliberately does not use it — see below.

### Accent budget
One accent element per screen, two at most. Home: the create button. Card screen: the status
pill and the primary button. The payment-approved screen uses a **paper-white** check, not
green — a mint tick above a mint button reads as decoration, and the point of that screen is the
sentence, not the colour.

## Icons

`assets/icon.png` and the Android icons are still Expo's defaults. Export
[mark-ghost.svg](mark-ghost.svg) at 1024×1024 on `#08080A` before submitting anything that shows
a home-screen icon. It does not appear in the live demo.

## Motion

Screens fade in over 220ms, driven off the route so a transition can never strand a screen
half-visible. Buttons dip to 0.97 on press. Nothing else moves.
