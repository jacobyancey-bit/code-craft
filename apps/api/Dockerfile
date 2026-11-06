# Multi-stage Dockerfile for Code_Craft API
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root monorepo files and package manifests
COPY package.json ./
COPY packages/database ./packages/database
COPY apps/api ./apps/api

# Install dependencies and build database package
WORKDIR /app/packages/database
RUN npm install
RUN npx prisma generate
RUN npm run build

# Install dependencies and build API service
WORKDIR /app/apps/api
RUN npm install
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
ENV HOST=0.0.0.0

COPY --from=builder /app/packages/database /app/packages/database
COPY --from=builder /app/apps/api/dist /app/apps/api/dist
COPY --from=builder /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=builder /app/apps/api/package.json /app/apps/api/package.json

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/server.js"]
