/* Creates AbacatePay products (MONTHLY, BRL) for plans priced in BRL and writes
   the ids back. Skips plans already linked. Run: bun run seed:abacate */
import { connectDatabase } from '../config/database';
import { ABACATEPAY_BASE_URL, abacatePayEnabled, getAbacateApiKey } from '../config/abacatepay';
import { PlanModel } from '../modules/plans/plans.model';

if (!abacatePayEnabled) {
  console.error('ABACATEPAY_API_KEY is not set');
  process.exit(1);
}

await connectDatabase();

const plans = await PlanModel.find({ active: true, isDefault: false }).lean();

for (const plan of plans) {
  const brl = plan.prices?.brl;
  if (!brl || brl <= 0) {
    console.log(`- ${plan.slug}: no BRL price set, skipping`);
    continue;
  }
  if (plan.gateways?.abacatepay?.productId) {
    console.log(`- ${plan.slug}: already linked (${plan.gateways.abacatepay.productId})`);
    continue;
  }

  const res = await fetch(`${ABACATEPAY_BASE_URL}/products/create`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getAbacateApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      externalId: plan.slug,
      name: `Robin ${plan.name}`,
      description: plan.description,
      price: Math.round(brl * 100),
      currency: 'BRL',
      cycle: 'MONTHLY',
    }),
  });
  const json = (await res.json()) as { data?: { id: string }; error?: unknown };
  if (!res.ok || json.error || !json.data) {
    console.error(`✗ ${plan.slug}: ${JSON.stringify(json.error ?? res.status)}`);
    continue;
  }

  await PlanModel.updateOne(
    { _id: plan._id },
    { $set: { 'gateways.abacatepay': { productId: json.data.id } } },
  );
  console.log(`✓ ${plan.slug}: R$${brl}/mês → ${json.data.id}`);
}

console.log('Done.');
process.exit(0);
