const API = 'http://localhost:4242';

async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

await call('POST', '/api/reset');

// 1. A card is minted in a person's name, with no merchant and no limit.
const { json: c1 } = await call('POST', '/api/cards', {
  cardHolder: 'Sasha Zhukovsky',
  cardType: 'Visa',
  isDefault: true,
});
const card = c1.card;
check('card is created in the cardholder name', card?.cardHolder === 'Sasha Zhukovsky');
check('new card has no merchant', card?.linkedSubscriptionId === null);
check('new card has no spending limit', card?.spendingLimit === null);

// 2. Two subscriptions.
const { json: s1 } = await call('POST', '/api/subscriptions', {
  name: 'Netflix',
  price: 1499,
  billingCycle: 'Monthly',
  description: 'Streaming',
  startDate: '2026-09-18',
});
const { json: s2 } = await call('POST', '/api/subscriptions', {
  name: 'Spotify',
  price: 1199,
  billingCycle: 'Monthly',
});
const netflix = s1.subscription;
const spotify = s2.subscription;
check('subscription is created', netflix?.name === 'Netflix' && netflix?.price === 1499);

// 3. An unlinked card cannot be charged at all.
const unlinked = await call('POST', `/api/subscriptions/${netflix.id}/charge`, {});
check('unlinked subscription cannot be charged', unlinked.status === 400, unlinked.json.error);

// 4. Linking sets the merchant and the limit from the plan.
const { json: linked } = await call('POST', `/api/subscriptions/${netflix.id}/link`, {
  cardId: card.id,
});
const afterLink = linked.cards.find((c) => c.id === card.id);
check('linking binds the card to the subscription', afterLink?.linkedSubscriptionId === netflix.id);
check(
  'linking sets the limit to the plan price',
  afterLink?.spendingLimit?.amount === 1499 && afterLink?.spendingLimit?.interval === 'monthly',
  JSON.stringify(afterLink?.spendingLimit),
);

// 5. The legitimate charge goes through.
const ok1 = await call('POST', `/api/subscriptions/${netflix.id}/charge`, {});
check('the plan charge is approved', ok1.json.approved === true);

// 6. A second charge in the same period blows the limit.
const ok2 = await call('POST', `/api/subscriptions/${netflix.id}/charge`, {});
check(
  'a second charge is declined on the limit',
  ok2.json.approved === false && /limit/i.test(ok2.json.transaction.declineReason),
  ok2.json.transaction?.declineReason,
);

// 7. Moving the card to Spotify must release Netflix.
await call('POST', `/api/subscriptions/${spotify.id}/link`, { cardId: card.id });
const { json: state1 } = await call('GET', '/api/state');
const nf = state1.subscriptions.find((s) => s.id === netflix.id);
const sp = state1.subscriptions.find((s) => s.id === spotify.id);
check('re-linking releases the old subscription', nf?.virtualCardId === null);
check('re-linking binds the new subscription', sp?.virtualCardId === card.id);
const nfCharge = await call('POST', `/api/subscriptions/${netflix.id}/charge`, {});
check('the released subscription can no longer charge', nfCharge.status === 400);
check(
  're-linking reset the spent counter for the new plan',
  state1.cards.find((c) => c.id === card.id)?.spentThisPeriod === 0,
);

// 8. Pausing blocks the merchant it is bound to.
await call('POST', `/api/cards/${card.id}/status`, { status: 'paused' });
const paused = await call('POST', `/api/subscriptions/${spotify.id}/charge`, {});
check(
  'a paused card declines its own merchant',
  paused.json.approved === false && /paused/i.test(paused.json.transaction.declineReason),
  paused.json.transaction?.declineReason,
);

// 9. Resume, then delete — deletion must kill future charges.
await call('POST', `/api/cards/${card.id}/status`, { status: 'active' });
await call('DELETE', `/api/cards/${card.id}`);
const afterDelete = await call('POST', `/api/subscriptions/${spotify.id}/charge`, {});
check(
  'a deleted card cannot be charged',
  afterDelete.status === 400 || afterDelete.json.approved === false,
  afterDelete.json.error ?? afterDelete.json.transaction?.declineReason,
);
const { json: state2 } = await call('GET', '/api/state');
check(
  'deleting the card unlinks it from the subscription',
  state2.subscriptions.find((s) => s.id === spotify.id)?.virtualCardId === null,
);
check('a deleted card is gone from the list', !state2.cards.some((c) => c.id === card.id));

// 10. Funding: the real card a virtual card settles to.
const { json: freshCard } = await call('POST', '/api/cards', {
  cardHolder: 'Sasha Zhukovsky',
  cardType: 'Visa',
  isDefault: false,
});
const fund = freshCard.card;
check('a new card starts with no funding source', fund.fundingCardId === null);

const { json: wallet } = await call('GET', '/api/physical-cards');
check('the wallet is seeded with physical cards', wallet.physicalCards.length >= 2);

const { json: funded } = await call('POST', `/api/cards/${fund.id}/funding`, {
  physicalCardId: wallet.physicalCards[0].id,
});
check(
  'a physical card can be attached as the funding source',
  funded.card.fundingCardId === wallet.physicalCards[0].id,
);

const badFunding = await call('POST', `/api/cards/${fund.id}/funding`, {
  physicalCardId: 'not-a-card',
});
check('an unknown funding card is rejected', badFunding.status === 404);

const badFour = await call('POST', '/api/physical-cards', { cardHolder: 'X', lastFour: '12' });
check('a malformed last four is rejected', badFour.status === 400);

await call('DELETE', `/api/physical-cards/${wallet.physicalCards[0].id}`);
const { json: afterWalletDelete } = await call('GET', '/api/state');
check(
  'removing a physical card clears it from the cards it funded',
  afterWalletDelete.cards.find((c) => c.id === fund.id)?.fundingCardId === null,
);

const { json: detached } = await call('POST', `/api/cards/${fund.id}/funding`, {
  physicalCardId: null,
});
check('the funding source can be detached', detached.card.fundingCardId === null);

await call('POST', '/api/reset');
const { json: afterReset } = await call('GET', '/api/state');
check('reset restores the wallet', afterReset.physicalCards.length >= 2);

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
