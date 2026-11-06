import { FastifyPluginAsync } from 'fastify';
import { prisma } from '@codecraft/database';
import { z } from 'zod';
import { createDepositPaymentIntent, stripe } from '../services/stripeService.js';

const CreateDepositSessionSchema = z.object({
  projectId: z.string().uuid('Valid projectId is required'),
});

export const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/payments/create-deposit-session
  fastify.post('/create-deposit-session', async (request, reply) => {
    const parseResult = CreateDepositSessionSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid projectId provided',
        issues: parseResult.error.format(),
      });
    }

    const { projectId } = parseResult.data;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { client: true },
    });

    if (!project) {
      return reply.status(404).send({
        error: 'Not Found',
        message: `Project with ID ${projectId} not found`,
      });
    }

    if (project.status !== 'PENDING_DEPOSIT') {
      return reply.status(400).send({
        error: 'Invalid State',
        message: `Project is already in status ${project.status}`,
      });
    }

    // Calculate initial 50% block amount: (minHours * hourlyRateCents) * 0.5
    const totalMinCostCents = project.minEstimatedHours * project.hourlyRateCents;
    const initialDepositCents = Math.round(totalMinCostCents * 0.5);

    try {
      const paymentIntent = await createDepositPaymentIntent({
        projectId: project.id,
        amountCents: initialDepositCents,
        clientEmail: project.client.email,
        clientName: project.client.name,
        projectTitle: project.title,
      });

      // Track PaymentIntent on the project
      await prisma.project.update({
        where: { id: project.id },
        data: {
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      return reply.status(200).send({
        projectId: project.id,
        depositAmountCents: initialDepositCents,
        depositHours: project.minEstimatedHours * 0.5,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
      });
    } catch (error: any) {
      request.log.error(error, 'Error creating Stripe payment session');
      return reply.status(500).send({
        error: 'Payment Error',
        message: error.message || 'Failed to create payment session',
      });
    }
  });
};

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/webhooks/stripe
  fastify.post('/stripe', async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string | undefined;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const rawBody = (request as any).rawBody;

    let event: any;

    try {
      if (webhookSecret && sig && rawBody) {
        event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
      } else {
        // Fallback in local/dev if signature is not strictly enforced
        event = request.body;
      }
    } catch (err: any) {
      request.log.error(err, 'Stripe webhook signature verification failed');
      return reply.status(400).send({ error: `Webhook Error: ${err.message}` });
    }

    // Handle payment_intent.succeeded
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const projectId = paymentIntent.metadata?.projectId;

      if (!projectId) {
        request.log.warn('payment_intent.succeeded received without projectId metadata');
        return reply.status(200).send({ received: true, ignored: true });
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        request.log.error(`Project ${projectId} not found during webhook processing`);
        return reply.status(404).send({ error: 'Project not found' });
      }

      // Initial funded hours = minEstimatedHours * 0.5
      const initialFundedHours = project.minEstimatedHours * 0.5;
      const customerId = (paymentIntent.customer as string) || null;
      const paymentMethodId = (paymentIntent.payment_method as string) || null;

      // Transactionally update Project and User
      await prisma.$transaction([
        prisma.project.update({
          where: { id: projectId },
          data: {
            status: 'OPEN_FOR_CLAIM',
            fundedHours: initialFundedHours,
            stripeCustomerId: customerId,
            defaultPaymentMethodId: paymentMethodId,
            stripePaymentIntentId: paymentIntent.id,
          },
        }),
        prisma.user.update({
          where: { id: project.clientId },
          data: {
            stripeCustomerId: customerId,
            defaultPaymentMethodId: paymentMethodId,
          },
        }),
      ]);

      request.log.info(
        `Project ${projectId} funded with ${initialFundedHours}h and transitioned to OPEN_FOR_CLAIM`
      );

      return reply.status(200).send({
        received: true,
        projectId,
        status: 'OPEN_FOR_CLAIM',
        fundedHours: initialFundedHours,
      });
    }

    return reply.status(200).send({ received: true });
  });
};
