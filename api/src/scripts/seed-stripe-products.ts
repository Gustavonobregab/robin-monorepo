/* Upserts Stripe products/prices from the plans and writes the ids back.
   Only mints a new price when the USD amount changed (prices are immutable).
   Run: bun run seed:stripe */
import { connectDatabase } from '../config/database';
import { stripe, stripeEnabled } from '../config/stripe';
import { PlanModel } from '../modules/plans/plans.model';

if (!stripeEnabled) {
  console.error('STRIPE_SECRET_KEY is not set');
  process.exit(1);
}

await connectDatabase();

const plans = await PlanModel.find({ active: true, isDefault: false }).lean();

for (const plan of plans) {
  const usd = plan.prices?.usd;
  if (!usd || usd <= 0) {
    console.log(`- ${plan.slug}: no USD price set, skipping`);
    continue;
  }
  const unitAmount = Math.round(usd * 100);

  let productId = plan.gateways?.stripe?.productId;
  if (productId) {
    await stripe.products.update(productId, { name: `Robin Wood ${plan.name}` });
  } else {
    const product = await stripe.products.create({
      name: `Robin Wood ${plan.name}`,
      metadata: { planSlug: plan.slug },
    });
    productId = product.id;
  }

  let priceId = plan.gateways?.stripe?.priceId;
  const current = priceId ? await stripe.prices.retrieve(priceId) : null;

  if (!current || current.unit_amount !== unitAmount) {
    const price = await stripe.prices.create({
      product: productId,
      currency: 'usd',
      unit_amount: unitAmount,
      recurring: { interval: 'month' },
      lookup_key: plan.slug,
      transfer_lookup_key: true,
    });
    priceId = price.id;
  }

  await PlanModel.updateOne(
    { _id: plan._id },
    { $set: { 'gateways.stripe': { productId, priceId } } },
  );

  console.log(`✓ ${plan.slug}: $${usd}/mo → ${priceId}`);
}

console.log('Done.');
process.exit(0);
