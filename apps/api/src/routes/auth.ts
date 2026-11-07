import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import '@fastify/jwt';
import { prisma } from '@codecraft/database';
import bcrypt from 'bcrypt';
import { z } from 'zod';

export const RegisterSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).optional(),
  role: z.enum(['CLIENT', 'TECH']).default('CLIENT'),
});

export const LoginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export interface JwtUserPayload {
  id: string;
  email: string;
  role: 'CLIENT' | 'TECH' | 'ADMIN';
}

/**
 * Higher-order middleware guard to enforce role-based access control (RBAC).
 */
export function requireRole(allowedRoles: Array<'CLIENT' | 'TECH' | 'ADMIN'>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
      const user = request.user as JwtUserPayload;

      if (!user || !allowedRoles.includes(user.role)) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
        });
      }
    } catch (err: any) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing Authorization header',
      });
    }
  };
}

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/auth/register
  fastify.post('/register', async (request, reply) => {
    const parseResult = RegisterSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid registration details',
        issues: parseResult.error.format(),
      });
    }

    const { email, password, name, role } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check for existing user
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return reply.status(409).send({
        error: 'Conflict',
        message: 'An account with this email address already exists',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name ?? null,
        role,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        activeJobs: true,
        createdAt: true,
      },
    });

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return reply.status(201).send({
      message: 'Account successfully registered',
      user,
      token,
    });
  });

  // POST /api/auth/login
  fastify.post('/login', async (request, reply) => {
    const parseResult = LoginSchema.safeParse(request.body);

    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid login payload',
      });
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.passwordHash) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid email or password',
      });
    }

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return reply.status(200).send({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        activeJobs: user.activeJobs,
      },
      token,
    });
  });

  // GET /api/auth/me (Protected route)
  fastify.get(
    '/me',
    {
      preHandler: async (request, reply) => {
        try {
          await request.jwtVerify();
        } catch {
          return reply.status(401).send({ error: 'Unauthorized', message: 'Authentication required' });
        }
      },
    },
    async (request, reply) => {
      const payload = request.user as JwtUserPayload;

      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          activeJobs: true,
          techUnlocks: true,
          createdAt: true,
        },
      });

      if (!user) {
        return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
      }

      return reply.status(200).send({ user });
    }
  );
};
