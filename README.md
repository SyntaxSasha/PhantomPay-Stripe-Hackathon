# PhantomPay

**Your real card stays yours. PhantomPay gives every subscription a different one.**

RUN ON: https://phantom-pay-stripe-hackathon-tau.vercel.app/

Mint a virtual card in your own name through Stripe Issuing, then bind it to one subscription.
That binding is what makes it merchant-specific: it takes the plan's price as its spending limit
and refuses every other merchant. Product brief and rules of engagement are in
[CLAUDE.md](CLAUDE.md); brand in [brand/](brand/README.md).

```
web/ (Vite + React)  ->  PhantomPay API (Express)  ->  Stripe Issuing
```

There are two clients against the same API. **`web/` is the demo surface** — it is the one that
gets driven on stage. `app/` is the original Expo build; it targets the older merchant-first API
and no longer matches the server.

## The model

A card belongs to a **person**, not to a merchant.

```
Card "Sasha Zhukovsky"  ──link──>  Subscription "Netflix $14.99/mo"
        ↑                                   ↓
   no merchant,                    sets the card's limit to $14.99/month
   no limit, cannot                and locks it to Netflix
   be charged at all
```

Until a card is linked it cannot be charged by anything. Linking is the moment a generic
credential becomes a merchant-specific one, and a card pays for exactly one subscription — binding
it somewhere new releases the old one.

A virtual card also points the other way, at the **physical card** it settles to — the one already
in your wallet. Click any virtual card to attach it. That is the half of the picture the merchant
never sees, and we hold only the last four of it: the full number is exactly what PhantomPay
exists to stop handing around.

## Run it

Two terminals.

```bash
cd server && npm install && npm start
```

```bash
cd web && npm install && npm run dev
```

Then open http://localhost:5173. Vite proxies `/api` to the server on :4242, so there is one
origin and no CORS to think about; point `PHANTOM_API` at a different target to override, or set
`VITE_API_URL` to skip the proxy entirely.

## Built with the Stripe CLI

The whole backing stack was provisioned through `stripe projects` rather than by signing up to
providers by hand. Every command below was actually run against this repo.

**Set up the CLI and the agent skills.**

```bash
npm install -g @stripe/cli          # v1.51.0
npx skills add https://docs.stripe.com
stripe projects --help              # installs the projects plugin on first use
```

**Register the project.** This writes `.projects/`, updates `.gitignore`, and drops agent
guidance into `AGENTS.md` and `.claude/`.

```bash
stripe projects init --yes
```

Two things that bite on Windows: the npm shim is `stripe.ps1`, which PowerShell refuses to run
under the default execution policy — call `stripe.cmd` instead of loosening the policy. And `init`
needs a browser for OAuth, so it cannot be run headlessly.

**Provision the stack.** Each provider needs its plan before its resource.

```bash
stripe projects catalog                          # 90 services, 63 providers
stripe projects add neon/free    --accept-tos --yes
stripe projects add neon/postgres --yes
stripe projects add vercel/hobby --accept-tos --yes
stripe projects add vercel/project --yes
stripe projects status
```

The CLI provisions the resource, then syncs its credentials straight into the repo-root `.env`:
`NEON_POSTGRES_CONNECTION_STRING`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` and the rest. Nothing was
copied out of a provider dashboard.

That `.env` is why [server/src/env.ts](server/src/env.ts) exists — it loads `server/.env` *and* the
repo-root one, and it has to be the first import in the process because ES imports are hoisted and
[stripe.ts](server/src/stripe.ts) reads `process.env` at module scope.

**Share it.**

```bash
stripe projects share
# https://projects.dev/s#v1:Neon~postgres,Vercel~project
```

A plan on its own is not shareable — `share` answers `EMPTY_STACK` until an actual resource
exists. Note there is no `stripe projects deploy`: the CLI provisions the Vercel project and hands
you a `VERCEL_TOKEN`, but pushing code is still the Vercel CLI's job.

### What the Neon database actually does

`stripe projects add neon/postgres` is not decoration. [store.ts](server/src/store.ts) keeps the
whole dataset in one JSONB row and reads it back on every API request, because serverless has no
writable disk and no instance affinity. With no connection string present it falls back to a local
JSON file, so `npm start` works on a laptop with nothing provisioned.

Writes are chained and a read waits on the outstanding write — without that, the per-request
refresh overtakes an unfinished persist and resurrects stale state. The `e2e` suite caught exactly
that: 23/25 before the fix, 25/25 after.

## Deploy

The API serves the built client from the same port when `web/dist` exists, so the whole thing is
**one service on one port** — no split frontend/backend hosting.

```bash
npm run build   # installs both workspaces and builds the client
npm start       # serves API + client on $PORT (default 4242)
```

[render.yaml](render.yaml) configures that for Render; the [Dockerfile](Dockerfile) does the same
for anything container-shaped. Set `STRIPE_SECRET_KEY` in the host's environment — never commit
it.

Two things to know before pointing voters at it:

- **State is shared.** With `NEON_POSTGRES_CONNECTION_STRING` set it lives in Neon and survives
  restarts; without it, in a local JSON file. Either way every visitor sees and mutates the same
  cards and subscriptions. Fine for a demo people click through; last-write-wins if several
  people act at once. The **Reset** button in the nav puts it back.
- **No auth.** Anything a visitor can reach, they can change.

## Stripe

Put a **test-mode** key in `server/.env` (copy `server/.env.example`), then:

```bash
cd server && npm run verify
```

That probe answers Priority 1 from the brief — it checks, with real API calls rather than
assumptions:

- whether Issuing is enabled on the account
- whether a virtual card can be created
- whether the PAN and CVC can be read back (they can, via `expand`, in test mode only — live mode
  needs ephemeral keys and a PCI-compliant client)
- whether test-mode authorizations can be driven
- whether Stripe itself enforces the spending limit

**Issuing has to be switched on per account.** A working key is not enough: until Issuing is
activated at https://dashboard.stripe.com/test/issuing/overview the probe reports
`Your account is not set up to use Issuing`, and the server generates cards locally instead.

The UI no longer prints which of the two is in play — it makes no claim either way, and it never
labels a locally generated card as Stripe-issued. `GET /api/status` still reports the truth, and
the server logs it on boot. **Cards are not Stripe-issued until Issuing is enabled**, so the line
to use in front of judges is *"the Stripe Issuing integration is built and live-ready, activation
on the account is pending"* — which is accurate; `createCard` in
[server/src/cards.ts](server/src/cards.ts) runs against the real API the moment the flag flips.

## What is real vs simulated

| | With Issuing | Without |
|---|---|---|
| The card | Stripe Issuing virtual card, cardholder named after you | Locally generated |
| PAN / CVC | Expanded from Stripe, test mode | Deterministic demo digits |
| Spending limit | Stripe `spending_controls` **and** our check | Our check only |
| A purchase | Real test-mode authorization + capture | Recorded locally |
| Merchant lock | Our rule, in `evaluate()` | Same rule |

Merchant locking is worth being precise about: Stripe's spending controls work on categories, not
on individual merchants. Per-merchant enforcement runs in `evaluate()` in
[server/src/cards.ts](server/src/cards.ts), which is wired to the real-time authorization webhook
at `/api/webhooks/issuing-authorization`. That endpoint is the production enforcement point and
needs a public tunnel to receive events, so in the demo the same function gates the charge
directly. Say "PhantomPay decides" — not "Stripe blocks it".

One more honesty note: Stripe picks the network it issues on, so the **Card Type** you choose is a
request, not a guarantee. The card face shows what Stripe actually returned.

## The demo, 90 seconds

1. **Virtual Cards** — create a card in your name. It has no merchant and no limit yet.
2. **Subscriptions** → add Netflix, $14.99/month.
3. On the subscription, pick that card as the payment method → it takes a **$14.99/month cap** and
   locks to Netflix.
4. **Charge $14.99** → *approved*, "your primary card was not given to the merchant".
5. **Charge again** → *declined*, the limit held.
6. Click the card → **Linked Physical Card** shows the real Visa it settles to, which the
   merchant never saw.
7. **Alerts** → the refused charge is already logged, next to the threats the card turned away.
8. Delete the card → future charges cannot be authorised.

Closing line: *"The merchant got a card. They just didn't get yours."*

The **Reset** button in the nav (`POST /api/reset`) clears everything between run-throughs.

## API

```
GET    /api/status                        capabilities probe result
GET    /api/state                         everything the client renders from

GET    /api/cards
POST   /api/cards                         { cardHolder, cardType, isDefault, fundingCardId? }
GET    /api/cards/:id
GET    /api/cards/:id/secret              PAN + CVC
POST   /api/cards/:id/status              { status: active | paused }
POST   /api/cards/:id/default
POST   /api/cards/:id/funding             { physicalCardId }  — null detaches
DELETE /api/cards/:id

GET    /api/physical-cards
POST   /api/physical-cards                { cardHolder, cardType, lastFour, issuer }
DELETE /api/physical-cards/:id

GET    /api/subscriptions
POST   /api/subscriptions                 { name, price, billingCycle, description, startDate }
GET    /api/subscriptions/:id
DELETE /api/subscriptions/:id
POST   /api/subscriptions/:id/link        { cardId }   — null unbinds
POST   /api/subscriptions/:id/charge      { amount? }  — defaults to the plan price

GET    /api/alerts
POST   /api/alerts/:id/resolve

POST   /api/reset
```

Amounts are in cents. Metadata lives in `server/data/db.json`; no PAN or CVC is ever written to
it.

`npm run e2e` in `server/` exercises the whole rule set against a running API — creation, linking,
re-linking, the limit, pause, delete, and the funding-card attachment. It resets the store at both
ends, so don't point it at anything you want to keep.

## The web client

```
web/src
  lib/api.ts       typed client for the endpoints above
  lib/store.tsx    cards, wallet, subscriptions, transactions, alerts — one context
  components/      Button, Overlay (+ ResultOverlay), PhantomCard, FundingSection
  screens/         Welcome, Subscriptions, SubscriptionDetails, AddSubscription,
                   VirtualCards, Alerts
```

[PhantomCard.tsx](web/src/components/PhantomCard.tsx) is the piece worth reading: a 3D flip card
that shows the cardholder, the PAN and a limit meter on the front, and the CVV behind a magnetic
stripe on the back. It never fetches the PAN on its own — `GET /api/cards/:id/secret` runs only
when the cardholder presses **Reveal number**, and nothing it returns is ever written to our
store.

The look is carried over from the SubscriptionWallet build: black base, `gray-900/50` glass
panels, a blue-to-purple gradient on anything primary, and the hover-flip card. That is a
deliberate departure from [brand/tokens.ts](brand/tokens.ts) and the single-accent rule in
CLAUDE.md §8 — the mint palette lives on in `brand/` if you want it back.

## The wallet

`physicalCards` in the store is the set of cards the user already holds. It is seeded with two on
a cold start and **survives `POST /api/reset`**, because it stands for real plastic rather than
demo state. Each row carries a last four, a type, an expiry and a nickname — never a full number,
and `POST /api/physical-cards` rejects anything that is not four digits.

Worth being precise about if asked: a real Stripe Issuing card is funded from the platform's
Issuing balance, not from a consumer's personal Visa. The funding link here models the consumer
relationship the product is about — "this card settles to mine" — and is PhantomPay's own
association, not a Stripe mechanism.

## Alerts

[server/src/alerts.ts](server/src/alerts.ts) feeds the Alerts page from two places, and the
distinction matters if anyone asks:

- **Derived** — every declined authorization becomes an alert, because a decline *is* the product
  working. These are real, computed from the transaction log, and never stored.
- **Scenario** — the three pre-written threats in `SCENARIOS` (repeat attempts, foreign terminal,
  merchant mismatch), seeded once per card so the page has something on it before anything has
  been charged. They are illustrative, not detections; there is no fraud model behind them.

Both render identically. If a judge asks how detection works, the honest answer is that the
enforcement is real and lives in `evaluate()` — the scoring model is not built.

## Leaderboard

Submission needs `init` then `share`, and `init` is not something the CLI can do headlessly —
it answers *"A person has to run `stripe projects init` in a terminal with browser access to
finish authenticating Projects"*, because Projects cannot read live-mode credentials from an API
key alone.

Submitted:

- **Share link** `https://projects.dev/s#v1:Neon~postgres,Vercel~project`
- **Account ID** `acct_1UHPyeC6Pb5YmIpn` — University of Toronto, the merchant the Projects
  project is registered to (see `.projects/state.local.json`)
- **Repo** https://github.com/SyntaxSasha/PhantomPay-Stripe-Hackathon

`stripe whoami` prints profile and device info rather than the account id when passed
`--api-key`; the id above came from `.projects/state.local.json`.

## Known gaps

- **Not deployed yet.** The Vercel project is provisioned and the app is serverless-ready, but no
  code has been pushed to it. Until then the demo runs from a laptop on the local network.
- **Issuing is not enabled on the account yet**, so cards are generated locally until it is
  switched on in the dashboard. The UI does not say so; you should, if asked.
- The scenario alerts are illustrative demo content, not real detections — see above.
- `app/` (Expo) still speaks the old merchant-first API and will error against this server. Either
  port it or drop it before demo day.
- App icons are Expo defaults — see [brand/README.md](brand/README.md).
- `app/` has its own `.git` from `create-expo-app`. Remove it before initialising a repo at the
  root, or the app directory won't be tracked.
- No auth. One implicit user. Deliberate — the Welcome screen goes straight in.
