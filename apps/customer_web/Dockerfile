FROM node:22-alpine AS builder

WORKDIR /app
COPY apps/customer_web ./apps/customer_web

WORKDIR /app/apps/customer_web
RUN npm install
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/customer_web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
