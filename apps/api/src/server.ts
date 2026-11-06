import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from '@codecraft/database';
import { projectRoutes } from './routes/projects.js';

const fastify = Fastify({
  logger: true,
});

async function bootstrap() {
  // Register CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true,
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

  // Register Project Routes
  await fastify.register(projectRoutes, { prefix: '/api/projects' });

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
