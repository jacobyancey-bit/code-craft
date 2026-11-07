import { JWT } from '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      id: string;
      email: string;
      role: 'CLIENT' | 'TECH' | 'ADMIN';
    };
    user: {
      id: string;
      email: string;
      role: 'CLIENT' | 'TECH' | 'ADMIN';
    };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    jwt: JWT;
  }
  interface FastifyRequest {
    jwtVerify<T = any>(): Promise<T>;
    user: {
      id: string;
      email: string;
      role: 'CLIENT' | 'TECH' | 'ADMIN';
    };
  }
}
