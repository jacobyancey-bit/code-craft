FROM node:22-alpine AS builder

WORKDIR /app
COPY apps/tech_web ./apps/tech_web

WORKDIR /app/apps/tech_web
RUN npm install
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/tech_web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

