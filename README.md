# 📍 Daily Status & Location Manager

A modern **Express.js + React** web application for tracking people, locations, and daily status updates with Excel export and optional Telegram integration.

**UI Language:** Hebrew | **Documentation:** English

---

## 🎯 What It Does

- **Daily status tracking** – Record and export daily status for each person
- **Location management** – Track people's locations with event logging
- **Excel exports** – One-click daily backups and filtered exports (`.xlsx`)
- **Telegram integration** – Optional self-report submission via Telegram bot
- **Persistent database** – People and locations stored in MariaDB via Prisma

---

## 🚀 Quick Start

For complete setup instructions, see **[INSTALLATION.md](./INSTALLATION.md)**.

### One-Command Start

```bash
./start_app.sh --dev
```

See all options:

```bash
./start_app.sh --help
```

---

## 🏗️ Architecture

### Backend (Express.js + TypeScript + Prisma)

#### Core Structure

| File / Directory | Purpose |
|-----------------|---------|
| `src/index.ts` | App entry point |
| `src/services/server.ts` | Express app setup, middleware, route registration, error handling |
| `src/config.ts` | Configuration validation (environment variables) |
| `src/modules/` | Feature modules: User, Location, LocationReport |
| `src/services/` | Business services: backup, Telegram bot |
| `src/utils/` | Shared utilities: errors, decorators, logging |

#### Module Pattern

Each feature module follows a consistent structure:

```
src/modules/User/
├── dal.ts        # Data access layer (Prisma queries)
├── router.ts     # Express route definitions
├── handlers.ts   # Request handler logic
├── schemas.ts    # Zod validation schemas
└── types.ts      # TypeScript types
```

The same pattern applies to `Location/` and `LocationReport/`.

#### Key Services

| Service | Purpose |
|---------|---------|
| `services/server.ts` | Express server: middleware, route registration, global error handler |
| `services/telegram/TelegramBot.ts` | Telegram bot polling and message handling |
| `services/backup.ts` | Excel export and backup management |
| `services/database.ts` | Prisma client initialization |

#### Utilities

| Utility | Purpose |
|---------|---------|
| `utils/decorators.ts` | `httpLogger` decorator for request/response logging |
| `utils/errors/` | Custom error types and client error helpers |
| `utils/middlewares.ts` | Multer file upload and shared Express middleware |
| `utils/logger.ts` | Winston logger configuration |
| `utils/validations.ts` | Shared Zod validation helpers |

---

### 🗄️ Database Schema

Database: **MariaDB** managed via **Prisma ORM** (`backend/prisma/schema.prisma`).

#### Models

**User**

| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | Primary key, auto-increment |
| `fullName` | String | Mapped to `full_name` |
| `phone` | String | Unique |
| `telegramUserId` | String? | Optional; mapped to `telegram_user_id` |

**Location**

| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | Primary key, auto-increment |
| `name` | String | Unique |

**LocationReport**

| Field | Type | Notes |
|-------|------|-------|
| `id` | Int | Primary key, auto-increment |
| `userId` | Int | Foreign key → User |
| `locationId` | Int | Foreign key → Location |
| `occurredAt` | DateTime | Defaults to now |
| `createdAt` | DateTime | Defaults to now |
| `isStatusOk` | Boolean? | Optional status flag |
| `source` | Source | Enum: `ui` or `bot` |
| `notes` | String? | Optional free text |

**Source Enum:** `ui` (submitted via web UI) | `bot` (submitted via Telegram bot)

---

### 🖥️ Frontend (React + TypeScript)

| File / Directory | Purpose |
|-----------------|---------|
| `src/App.jsx` | Main app state and page logic |
| `src/api/client.ts` | API client methods |
| `src/components/` | UI components (tables, modals) |
| `src/constants/` | Shared UI constants |
| `src/styles.css` | Styling |

Built with **React**, **TypeScript**, and **Vite**.

---

## 📋 API Endpoints

Base URL: `http://localhost:3000`

### 👤 Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users` | Get all users |
| `GET` | `/users/:id` | Get user by ID |
| `POST` | `/users` | Create user |
| `PUT` | `/users/:id` | Update user |
| `DELETE` | `/users/:id` | Delete user |
| `POST` | `/users/excel` | Bulk upload users from Excel |

### 📍 Locations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/locations` | Get all locations |
| `GET` | `/locations/:id` | Get location by ID |
| `POST` | `/locations` | Create location |
| `DELETE` | `/locations/:id` | Delete location |
| `POST` | `/locations/excel` | Bulk upload locations from Excel |

### 📊 Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/reports` | Get reports (default: today) |
| `POST` | `/reports` | Create report |
| `PUT` | `/reports/:id` | Update report |
| `DELETE` | `/reports/:id` | Delete report |
| `GET` | `/reports/export` | Export filtered reports to Excel |
| `POST` | `/reports/backup` | Trigger manual backup |
| `GET` | `/reports/backup/list` | List available backups |
| `GET` | `/reports/backup/download/:file` | Download a backup file |

#### Report Filters (query parameters)

| Parameter | Type | Description |
|-----------|------|-------------|
| `date` | date | Filter by specific date |
| `minDate` | date-time | Filter from this date/time |
| `maxDate` | date-time | Filter up to this date/time |
| `userId` | integer | Filter by user ID |
| `locationId` | integer | Filter by location ID |
| `status` | string | Filter by status value |

Full OpenAPI spec: [`backend/openapi.yaml`](./backend/openapi.yaml)

---

## 🔧 Configuration

### Environment Variables (`.env` in `backend/`)

```env
NODE_ENV=development
DATABASE_URL=mysql://user:password@localhost:3306/daily_status
TELEGRAM_BOT_TOKEN=your_bot_token_here
PORT=3000
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | MariaDB/MySQL connection string |
| `TELEGRAM_BOT_TOKEN` | ⬜ | Telegram bot token (optional) |
| `PORT` | ⬜ | Server port (default: `3000`) |
| `NODE_ENV` | ⬜ | `development` or `production` |

---

## 📦 Tech Stack

### Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Node.js | 18+ | Runtime |
| Express.js | 4.x | HTTP framework |
| TypeScript | 5.x | Language |
| Prisma | 7.x | ORM + migrations |
| MariaDB | — | Database |
| Zod | 4.x | Request validation |
| Winston | 3.x | Logging |
| ExcelJS | 4.x | Excel export |
| Telegraf | 4.x | Telegram bot |
| Jest | — | Unit testing |
| Nodemon | — | Dev hot-reload |

### Frontend

| Technology | Purpose |
|-----------|---------|
| React | UI framework |
| TypeScript | Language |
| Vite | Build tool |
| Playwright | E2E testing |

---

## 🧪 Testing & Building

### Backend

```bash
cd backend
npm run dev          # Development mode (watch + hot-reload)
npm run build        # TypeScript compilation
npm test             # Run Jest unit tests
npm run build:db     # Run Prisma migrations
npm run update:db    # Regenerate Prisma client
npm start            # Production mode (compiled dist)
```

### Frontend

```bash
cd frontend
npm run build              # Production build
npm run test:e2e:install   # Install Playwright browsers
npm run test:e2e           # Run E2E tests
```

---

## 🔐 Security & Reliability

- ✅ Secrets in `.env` (never committed)
- ✅ Zod schema validation on all request inputs
- ✅ Global error handler prevents internal detail leaks
- ✅ SQL injection prevention via Prisma prepared statements
- ✅ Request/response logging via `httpLogger` decorator (Winston)
- ✅ CORS enabled for frontend access
- ✅ HTTP status codes for clear API responses

---

## 🚀 Production Deployment

### Docker

```bash
cd backend
docker build -f dockerfile -t daily-status-backend .
docker run \
  -e DATABASE_URL=mysql://user:password@host:3306/db \
  -e TELEGRAM_BOT_TOKEN=your_token \
  -p 3000:3000 \
  daily-status-backend
```

### Docker Compose

```bash
docker-compose up -d
```

See [`docker-compose.yml`](./docker-compose.yml) for full configuration.

---

## ❓ Troubleshooting

| Issue | Solution |
|-------|----------|
| *Database connection failed* | Verify `DATABASE_URL` in `.env` and that MariaDB is running |
| *Telegram bot not starting* | Ensure `TELEGRAM_BOT_TOKEN` is set correctly in `.env` |
| *Frontend can't reach backend* | Check the frontend proxy config or `VITE_API_BASE_URL` |
| *Port already in use* | Change `PORT` in `.env` |
| *Prisma client out of sync* | Run `npm run update:db` in `backend/` |
| *Migration failed* | Run `npm run build:db` in `backend/` |

---

## 📚 Documentation

- [Installation Guide](./INSTALLATION.md)
- [OpenAPI Spec](./backend/openapi.yaml)
- [Prisma Schema](./backend/prisma/schema.prisma)
- [DevOps Notes](./README.devops.md)
