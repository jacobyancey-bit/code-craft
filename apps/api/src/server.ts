import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import { prisma } from '@codecraft/database';
import { projectRoutes } from './routes/projects.js';
import { paymentRoutes, webhookRoutes } from './routes/payments.js';
import { techRoutes } from './routes/tech.js';
import { authRoutes } from './routes/auth.js';

const fastify = Fastify({
  logger: true,
});

async function bootstrap() {
  // Capture raw request body buffer for Stripe signature verification
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      (req as any).rawBody = body;
      try {
        const json = JSON.parse(body.toString('utf8'));
        done(null, json);
      } catch (err: any) {
        done(err, undefined);
      }
    }
  );

  // Register CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
  });

  // Register JWT Authentication
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'codecraft_super_secret_jwt_key_2026_dev',
  });

  // GET /health route
  fastify.get('/health', async (request, reply) => {
    try {
      // Ping database via Prisma
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch (error) {
      request.log.error(error, 'Database ping failed');
      return reply.status(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      });
    }
  });

  // Register API Routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(projectRoutes, { prefix: '/api/projects' });
  await fastify.register(paymentRoutes, { prefix: '/api/payments' });
  await fastify.register(webhookRoutes, { prefix: '/api/webhooks' });
  await fastify.register(techRoutes, { prefix: '/api/tech' });

  const PORT = Number(process.env.PORT) || 4000;
  const HOST = process.env.HOST || '0.0.0.0';

  try {
    await fastify.listen({ port: PORT, host: HOST });
    console.log(`🚀 Code_Craft API server running at http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

bootstrap();
