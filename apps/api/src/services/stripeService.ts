import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder';

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-01-27.acacia' as any,
  typescript: true,
});

export interface CreateDepositSessionParams {
  projectId: string;
  amountCents: number;
  clientEmail: string;
  clientName?: string | null;
  projectTitle: string;
}

export async function createDepositPaymentIntent(params: CreateDepositSessionParams) {
  const { projectId, amountCents, clientEmail, clientName, projectTitle } = params;

  // If running in development with dummy key, create a mock payment intent response
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_placeholder') {
    return {
      id: `pi_mock_${Date.now()}`,
      client_secret: `pi_mock_secret_${Date.now()}`,
      amount: amountCents,
      currency: 'usd',
      status: 'requires_payment_method',
      setup_future_usage: 'off_session',
      customer: `cus_mock_${Date.now()}`,
      metadata: {
        projectId,
        clientEmail,
        projectTitle,
      },
    };
  }

  // Create or retrieve Stripe customer
  const existingCustomers = await stripe.customers.list({
    email: clientEmail,
    limit: 1,
  });

  let customerId: string;
  if (existingCustomers.data.length > 0) {
    customerId = existingCustomers.data[0].id;
  } else {
    const customer = await stripe.customers.create({
      email: clientEmail,
      name: clientName ?? undefined,
      metadata: { projectId },
    });
    customerId = customer.id;
  }

  // Create PaymentIntent configured for off_session future usage (for drawdown reload blocks)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: customerId,
    setup_future_usage: 'off_session',
    description: `Initial 50% deposit block for project: ${projectTitle}`,
    metadata: {
      projectId,
      clientEmail,
      projectTitle,
      depositType: 'initial_block',
    },
  });

  return paymentIntent;
}

