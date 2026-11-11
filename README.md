# ShopSphere AI

A production-oriented e-commerce foundation with a React/Vite storefront, Express REST API, Prisma/PostgreSQL data model, JWT authentication, and official AON Content Assistant placement.

## Local setup

### 1. Install prerequisites

- Node.js 20+ and npm
- PostgreSQL 16+ (the project currently uses a local PostgreSQL service)

Docker is optional. If you use `docker-compose.yml`, use its credentials (`shopsphere` / `shopsphere`) and set the matching `DB_*` values in `backend/.env`.

### 2. Configure the backend

Copy `backend/.env.example` to `backend/.env`, then set the credentials for an existing PostgreSQL database:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shopsphere_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
JWT_SECRET=use-a-long-random-secret
PORT=4000
FRONTEND_URL=http://localhost:5173
```

`DATABASE_URL` may remain blank. The backend derives it from the `DB_*` values.

Create the database once if needed:

```sql
CREATE DATABASE shopsphere_db;
```

### 3. Install and initialize

From `C:\Projects\shopsphere-ai`:

```powershell
npm install
npm run db:init
npm run db:generate
npm run db:seed
```

The initializer is safe to run again. Seeding is idempotent for the demo categories and products.

### 4. Run the application

```powershell
npm run dev
```

Open the Vite URL, not `frontend/index.html` directly:

- Storefront: `http://localhost:5173`
- API health: `http://localhost:4000/api/health`
- Database health: `http://localhost:4000/api/health/db`

Only run one `npm run dev` process at a time. If port 4000 or 5173 is already in use, stop the existing Node/Vite process with `Ctrl+C`.

### 5. Development workflow

1. Change frontend code under `frontend/src`; Vite reloads automatically.
2. Change backend code under `backend/src`; Node watch mode restarts automatically.
3. After schema or SQL changes, run `npm run db:init` and `npm run db:generate`.
4. After changing seed data, run `npm run db:seed`.
5. Before sharing changes, run:

```powershell
npm run build
npm test
```

The storefront runs at `http://localhost:5173`; the API health check is `http://localhost:4000/api/health`.
The PostgreSQL health check is `http://localhost:4000/api/health/db`. It returns HTTP 200 only after `DB_PASSWORD` is filled and the database connection succeeds.

The backend uses a reusable `pg` connection pool for health checks and schema initialization. Prisma remains the application ORM and derives its runtime `DATABASE_URL` from the `DB_*` values.

## Production

Deploy `frontend` to Vercel with `VITE_API_URL` pointing to the Render API. Deploy `backend` to Render with `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, and payment credentials configured as secrets. Run Prisma generation during the build phase and `npm run db:migrate:deploy` as the Render release command before starting the service. Enable HTTPS and restrict CORS to the frontend origin.

The repository now includes the initial Prisma migration at `backend/prisma/migrations/20261110170000_initial_schema`. It creates the schema represented by `backend/prisma/schema.prisma` without resetting or dropping existing data. The deployed database must be the intended empty/new database, or an operator must reconcile an already-initialized database before marking this migration applied; do not run `prisma migrate reset`.

Render commands:

```text
Build:  npm install && npx prisma generate
Release: npm run db:migrate:deploy
Start:  npm start
```

`npm start` also runs `prisma migrate deploy` before starting Express, so deployments that do not expose a separate release-command field still apply checked-in migrations. It never resets or drops the database. After startup, verify `https://your-backend-service.onrender.com/api/health/db` and then `https://your-backend-service.onrender.com/api/products`.

For the current Netlify deployment, configure the site environment variable `VITE_API_URL` to the deployed backend URL including `/api` (for example, `https://shopsphere-api.onrender.com/api`) before redeploying. Without this variable, production requests use the same-origin `/api` path and cannot reach a separately hosted backend. The frontend keeps `http://localhost:4000/api` only for Vite development mode.

Netlify deployment:

```powershell
Set-Location C:\Projects\shopsphere-ai\frontend
npx netlify-cli env:set VITE_API_URL https://your-backend-service.onrender.com/api
npm run build
npx netlify-cli deploy --prod --dir dist
```

The `public/_redirects` rule preserves React Router routes such as `/products` on direct HTTPS navigation.

## AON

The official public AON script is loaded once in `frontend/index.html`, immediately before `</body>`, using placement ID `plc_bl2OjNEBsvByZQ6J`. Product and homepage content render an end-of-content slot after the relevant content. This project does not fabricate offers or call undocumented AON endpoints.

Live AON network delivery must be verified on the deployed HTTPS origin using browser/network inspection; local builds only verify that the exact public script configuration is emitted.

## Current implementation coverage

The current foundation includes the responsive storefront, product discovery/search/sorting, JWT registration and login, persisted guest cart, wishlist route/API, transactional checkout inventory decrement, order history/details/cancellation, admin dashboard authorization, Prisma/PostgreSQL schema and seed data, Razorpay signature verification endpoints, security middleware, and AON integration. Payment credentials and database secrets remain backend-only.

Before production launch, complete deployment-specific verification for configured Razorpay credentials, email verification/password reset delivery, Cloudinary uploads, and live AON delivery. These require external services and are intentionally not represented as successful locally.
