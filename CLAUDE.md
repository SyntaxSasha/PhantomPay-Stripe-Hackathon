# Phantom — Stripe Hackathon MVP

> Your real card stays yours. Phantom gives every merchant a different one.

## 0. Ground rules for this repo

This is a **completely separate hackathon MVP** from the existing PhantomPay product/codebase.
We reuse the *brand* and the *idea* only.

- Do **not** reuse, migrate, or reproduce the existing PhantomPay backend architecture.
- The goal is **not** a production-ready fintech platform.
- The goal is an exceptionally clean, convincing MVP that sells the core idea to Stripe
  hackathon judges in a 60–90 second live demo.

Priorities, in order:

1. A compelling product concept
2. A beautiful React Native experience
3. A real Stripe integration
4. A very fast, understandable demo
5. Clear differentiation from Apple Pay and ordinary Stripe tokenization
6. Minimal complexity

## 1. The problem

Every time a consumer gives a website their card, they hand that merchant a **reusable payment
credential**. That means:

- Merchants retain credentials for future charges
- Subscriptions keep charging after users forget about them
- A compromised merchant exposes payment credentials
- Consumers have little control over individual merchant payment relationships
- Apple Pay only helps when the merchant supports Apple Pay
- Stripe tokenization protects card *data*, but the credential still represents the user's
  underlying funding source

**Core insight:** instead of protecting your card number, what if you never gave every merchant
the same card number in the first place?

## 2. The product

Phantom creates **merchant-specific virtual cards**.

```
REAL CARD
    |
  PHANTOM
    |
VIRTUAL CARD A -> Netflix       $20/month limit
VIRTUAL CARD B -> Amazon        $100 maximum
VIRTUAL CARD C -> Random site   $50 max, expires in 30 days
```

Each virtual card carries its own rules. The consumer stays in control of the credential.

## 3. Differentiation (do not get this wrong)

Do **NOT** pitch Phantom as "we encrypt your payment information." That is not differentiated —
Stripe already does tokenization, Apple Pay already uses a device-specific credential.

| | Position |
|---|---|
| Stripe / Apple Pay | Protect the underlying card credential **during** a payment |
| **Phantom** | Create a **new, controlled credential per merchant or purchase** |

One line: **Phantom gives merchants a different card instead of giving them yours.**

### The Apple Pay objection

> "Why wouldn't I just use Apple Pay?"

Apple Pay is excellent *when the merchant supports Apple Pay*. Many sites still show
`Card number / Expiration / CVC` and require manual entry. Phantom works with the ordinary
card-entry flow — the merchant integrates nothing.

> Apple Pay protects your card when you use Apple Pay. Phantom gives you a different card even
> when a website only accepts a card number.

Never claim Phantom is universally superior to Apple Pay. The distinction is the use case.

## 4. Stripe integration

Stripe must be **meaningful**, not a checkout button bolted on. The relevant product is
**Stripe Issuing** (virtual card infrastructure).

```
React Native app -> Phantom backend -> Stripe Issuing API -> Virtual card -> Merchant
```

Use the official Stripe SDK/API rather than mocking card generation **if** the required Issuing
functionality is available on the hackathon account.

### Technical constraint — verify before building UI

Do **not** assume creating an Issuing card returns full PAN and CVC in the normal API response.
Sensitive details are intentionally protected. Investigate first:

1. Is Issuing available for the hackathon account?
2. Can virtual cards actually be created?
3. How does Stripe expose sensitive card details?
4. What auth/permissions are required?
5. Can the card be used for real or test transactions?
6. What are test-mode limitations?
7. Can card details be displayed securely in React Native?

**If Issuing is unavailable, do not fake a Stripe integration and claim Stripe generated the
card.** Build the cleanest prototype around what Stripe *does* offer, and clearly separate
simulated elements from real Stripe functionality.

## 5. Screens (~4 total)

### Screen 1 — Home
```
PHANTOM
Your payment identity, under your control.

[ + Create protected card ]

ACTIVE CARDS
Netflix   $14.99 / month   Active
Amazon    $100 limit       Active
Adobe     $60 / month      Active
```

### Screen 2 — Create card
```
CREATE PROTECTED CARD
Merchant         [ Netflix        ]
Spending limit   [ $20 / month    ]
Expiration       [ 30 days        ]
[ Create Card ]
```
Optional controls: one-time vs recurring, merchant restriction.

### Screen 3 — Virtual card
```
NETFLIX
PHANTOM VIRTUAL CARD
4242 .... .... 9182
EXP 12/29    CVC ...
$14.99 / $20.00 this month
ACTIVE
[ Pause Card ]  [ Delete Card ]
```
Show real Stripe-issued details if retrievable securely; otherwise clearly labelled test/demo
data. Never present simulated data as a live Stripe-issued card.

### Screen 4 — Transaction
```
PAYMENT APPROVED
Netflix   $14.99
Paid with Phantom Virtual Card
Your primary card was not given to the merchant.
```

## 6. The killer demo (60–90s)

1. Open Phantom — "every website gets a different card"
2. Tap **Create protected card** → Netflix, $20/month
3. Phantom creates the card through Stripe's infrastructure — show the card
4. Show the controls (limit, status)
5. Show a transaction: Netflix $14.99 approved
6. Delete the card → "CARD DELETED. Future charges blocked."

Closing line: **"The merchant got a card. They just didn't get yours."**

### Subscription use case
Free trial → Phantom card, $20/month max, expires in 30 days. Don't want it? Delete the Phantom
card instead of hunting for a cancellation page. **Describe this as blocking the payment
credential — not as magically cancelling the merchant's subscription agreement.**

### Merchant-specific cards
Restricting a card to one merchant is a strong differentiator. Verify whether Stripe Issuing
spending controls support it before building. If not reliable in the hackathon environment,
simulate the UX — never pretend Stripe provides a capability it does not.

## 7. Product philosophy

Feel: minimal, premium, secure, simple, consumer-friendly, technically credible.

Avoid: huge dashboards, excessive settings, complex onboarding, fake analytics, generic AI
features, blockchain, crypto, unnecessary animations, over-engineered backend.

Judges should understand the product in 10 seconds.

## 8. Visual direction

Modern fintech infrastructure. Black/white base, strong typography, minimal cards, subtle
motion, clean spacing, **one restrained accent color**, high-quality mobile-first UI.
The card itself is the hero object.

## 9. Architecture

```
React Native  ->  small API  ->  Stripe
```

Backend does only: create a card, retrieve card info via the appropriate Stripe mechanism,
store minimal card metadata, manage card status, record demo transactions.

### Data model
```
User -> VirtualCard -> Transaction

VirtualCard { id, merchantName, stripeCardId, status, spendingLimit, expirationDate, createdAt }
```

### Security principle
Phantom must not become another place where raw card data is stored. Stripe owns sensitive
credentials. Phantom manages card identity, merchant association, spending rules, status, and
user-facing controls. No PAN/CVC in our database unless Stripe's official architecture requires
it and the implementation is compliant.

## 10. What we are NOT building

Not the production PhantomPay platform. Not a Canadian banking platform. Not a complete card
issuer. Not a Stripe or Apple Pay replacement. Not a subscription-management platform. Not a
fraud-detection platform. Not production-ready.

It is a demonstration of **programmable, merchant-specific payment credentials powered by
Stripe infrastructure**.

## 11. Build order

1. Verify Stripe Issuing availability and capabilities
2. Working Stripe virtual-card flow
3. React Native card creation screen
4. The virtual-card screen
5. Card controls
6. Transaction / demo flow
7. Polish: animation, typography, onboarding, presentation

Do not spend significant time on infrastructure that does not improve the live demo.

## 12. Success metric

A judge watches once and immediately thinks:

> "Instead of giving every merchant my real card, this app creates a different card that I
> control."

Everything else is secondary.

## 13. Brand

See [brand/README.md](brand/README.md) for the logo marks and palette. Design tokens live in
[brand/tokens.ts](brand/tokens.ts) — import from there rather than hardcoding hex values.

<!-- stripe-projects-cli managed:claude-md:start -->
look at AGENTS.md for your rules
<!-- stripe-projects-cli managed:claude-md:end -->
