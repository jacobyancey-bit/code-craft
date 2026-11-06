# Code_Craft

A unified, full-stack monorepo delivering end-to-end service management and customer engagement across web and mobile platforms.

Code_Craft connects customers, field technicians, and operations teams through dedicated web portals and native cross-platform mobile applications, powered by a shared backend API, database layer, and cross-client UI systems.

---

## 🏗️ Architecture

```text
Code_Craft/
├── apps/
│   ├── api/               # Central backend REST & WebSocket API (Node.js / TypeScript)
│   ├── customer_mobile/   # Customer-facing mobile application (Flutter)
│   ├── customer_web/      # Customer-facing web portal (React / TypeScript)
│   ├── tech_mobile/       # Field technician mobile application (Flutter)
│   └── tech_web/          # Operations & technician admin dashboard (React / TypeScript)
│
├── packages/
│   ├── database/          # Prisma schema, migrations, and PostgreSQL client
│   ├── models/            # Shared cross-platform Dart/Flutter data models
│   ├── api_client/        # Type-safe Dart HTTP/API client SDK
│   └── ui_kit/            # Reusable Flutter design system & UI components
│
├── docker-compose.yml     # Local services (PostgreSQL 16, Redis 7)
└── .env.example           # Example environment variables
```

---

## 🚀 Tech Stack

- **Mobile:** [Flutter](https://flutter.dev) (iOS & Android) + Dart
- **Web:** [React](https://react.dev) / TypeScript
- **Backend:** Node.js / TypeScript + REST & WebSocket APIs
- **Database & Cache:** [PostgreSQL 16](https://www.postgresql.org/) managed via [Prisma ORM](https://www.prisma.io/), [Redis 7](https://redis.io/)
- **Infrastructure:** Docker & Docker Compose

---

## 🛠️ Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js](https://nodejs.org/) (v20+)
- [Flutter SDK](https://flutter.dev/docs/get-started/install) (3.x+) & Dart (3.x+)

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/Code_Craft.git
cd Code_Craft
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Start Local Services
Launch PostgreSQL and Redis using Docker Compose:
```bash
docker compose up -d
```

| Service | Container Name | Host Port | Internal Port | Database / Key |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL 16** | `codecraft_postgres` | `5433` | `5432` | `codecraft_dev` |
| **Redis 7** | `codecraft_redis` | `6380` | `6379` | Default DB |

---

## 📦 Monorepo Workspaces

| Workspace | Type | Description |
| :--- | :--- | :--- |
| `apps/api` | Backend | Core REST & WebSocket services |
| `apps/customer_mobile` | Mobile (Flutter) | Client mobile app for order tracking & requests |
| `apps/customer_web` | Web (React) | Customer portal for account management and booking |
| `apps/tech_mobile` | Mobile (Flutter) | Field technician app for job dispatch, routes & checklists |
| `apps/tech_web` | Web (React) | Admin and dispatcher dashboard |
| `packages/database` | Shared Lib | Prisma schema, migrations, and database client |
| `packages/api_client` | Shared Lib | Generated / typed Dart API client |
| `packages/models` | Shared Lib | Shared Dart entities and serialization models |
| `packages/ui_kit` | Shared Lib | Shared Flutter widgets, themes, and design tokens |

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

