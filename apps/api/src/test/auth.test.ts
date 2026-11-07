import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import { prisma } from '@codecraft/database';
import { authRoutes, requireRole } from '../routes/auth.js';

describe('Authentication & Role-Based Access Control (RBAC)', () => {
  let app: FastifyInstance;
  let clientToken: string;
  let techToken: string;
  let testUserId: string;

  beforeAll(async () => {
    app = Fastify();
    await app.register(cors);
    await app.register(fastifyJwt, {
      secret: 'test_jwt_secret_codecraft_2026',
    });
    await app.register(authRoutes, { prefix: '/api/auth' });

    // Dummy test route protected by TECH role requirement
    app.get(
      '/api/test/tech-only',
      { preHandler: [requireRole(['TECH'])] },
      async (request) => {
        return { message: 'Tech access granted', user: request.user };
      }
    );

    await app.ready();
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await app.close();
  });

  it('registers a new user and returns a signed JWT token', async () => {
    const email = `newuser_${Date.now()}@test.com`;

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email,
        password: 'securePassword123!',
        name: 'Jane Doe',
        role: 'CLIENT',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);

    expect(body.user.email).toBe(email);
    expect(body.user.role).toBe('CLIENT');
    expect(body.token).toBeDefined();

    clientToken = body.token;
    testUserId = body.user.id;
  });

  it('rejects registration with duplicate email', async () => {
    const user = await prisma.user.findUnique({ where: { id: testUserId } });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: user!.email,
        password: 'securePassword123!',
      },
    });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Conflict');
  });

  it('rejects registration when password is less than 8 characters', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        email: `shortpass_${Date.now()}@test.com`,
        password: 'short',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Validation Error');
  });

  it('authenticates seeded technician (alex.tech@codecraft.dev) via login', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'alex.tech@codecraft.dev',
        password: 'password123',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);

    expect(body.user.email).toBe('alex.tech@codecraft.dev');
    expect(body.user.role).toBe('TECH');
    expect(body.token).toBeDefined();

    techToken = body.token;
  });

  it('rejects login with incorrect password', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'alex.tech@codecraft.dev',
        password: 'wrongpassword',
      },
    });

    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Unauthorized');
  });

  it('GET /api/auth/me returns current user profile with valid Bearer token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: `Bearer ${techToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);

    expect(body.user.email).toBe('alex.tech@codecraft.dev');
    expect(body.user.role).toBe('TECH');
    expect(body.user.techUnlocks.length).toBeGreaterThan(0);
  });

  it('rejects GET /api/auth/me without authorization header', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
    });

    expect(res.statusCode).toBe(401);
  });

  it('RBAC Guard: blocks CLIENT from accessing TECH-only route with 403 Forbidden', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/test/tech-only',
      headers: {
        authorization: `Bearer ${clientToken}`,
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('Forbidden');
  });

  it('RBAC Guard: permits TECH to access TECH-only route', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/test/tech-only',
      headers: {
        authorization: `Bearer ${techToken}`,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.message).toBe('Tech access granted');
    expect(body.user.role).toBe('TECH');
  });
});
