# Prisbo Creations

Next.js 15 e-commerce app for **Prisbo Creations**: MongoDB catalog, JWT session (httpOnly cookie), Razorpay checkout, customer storefront, and admin dashboard.

## Security

- **Never commit** `.env.local`. Copy [.env.example](.env.example) and fill in secrets locally.
- If database or Razorpay keys were ever shared in chat or committed, **rotate them** in Atlas / Razorpay.

## Prerequisites

- Node.js 18+
- MongoDB Atlas (or local MongoDB)

## Setup

1. `npm install`
2. Create `.env.local` from `.env.example`:
   - `MONGODB_URI` — SRV connection string (include `?retryWrites=true&w=majority` if needed).
   - `JWT_SECRET` — long random string (16+ chars).
   - `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` — from Razorpay Dashboard (test mode for development).
   - `RAZORPAY_WEBHOOK_SECRET` — optional in dev; **required in production** for `/api/v1/payments/razorpay/webhook`.
   - `NEXT_PUBLIC_APP_URL` — e.g. `http://localhost:3000`
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — optional; `npm run seed` upserts an admin user when both are set.

3. Seed **categories → subcategories → products** (Unsplash image URLs in [scripts/seed.ts](scripts/seed.ts)):

   ```bash
   npm run seed
   ```

   **Admin user only** (does not touch catalog — uses `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env.local`):

   ```bash
   npm run seed:admin
   ```

4. Dev server:

   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000). Sign in as the seeded admin to access `/admin`.

Checkout supports **Razorpay (online)** and **cash on delivery (COD)**. COD orders are created with status `processing` and stock is reduced immediately; online orders stay `pending` until payment succeeds.

## Razorpay (test)

1. Use **Test Mode** keys in `.env.local`.
2. Complete checkout on the site; use [Razorpay test cards / UPI](https://razorpay.com/docs/payments/payments/test-card-details/) from official docs.
3. For webhooks locally, use Razorpay webhook tunnel or deploy; set `RAZORPAY_WEBHOOK_SECRET` to the secret from the dashboard.

## API (REST, versioned)

Base path: `/api/v1`

| Method | Path | Notes |
|--------|------|--------|
| POST | `/auth/register` | Sets session cookie |
| POST | `/auth/login` | Sets session cookie |
| POST | `/auth/logout` | Clears cookie |
| GET | `/auth/me` | Current user |
| GET | `/categories` | Public |
| GET | `/categories/[slug]` | Public (single category) |
| GET | `/categories/[slug]/subcategories` | Public |
| GET | `/products?category=&subcategory=&q=` | Public; use **both** `category` and `subcategory` slugs to list a subcategory’s products |
| GET | `/products/[slug]` | Public |
| GET, POST | `/orders` | List: auth. Create: auth or guest + `guestEmail`; body `paymentMethod`: `online` (default) or `cod` |
| GET | `/orders/[id]` | Auth: own order |
| POST | `/payments/razorpay/create-order` | Auth: `{ orderId }` |
| POST | `/payments/razorpay/verify` | Auth: Razorpay callback payload |
| POST | `/payments/razorpay/webhook` | Raw body; HMAC if secret set |
| GET, POST | `/admin/categories` | Admin |
| PATCH, DELETE | `/admin/categories/[id]` | Admin |
| GET, POST | `/admin/subcategories` | Admin |
| PATCH, DELETE | `/admin/subcategories/[id]` | Admin |
| GET, POST | `/admin/products` | Admin; body uses `subcategoryId` |
| PATCH, DELETE | `/admin/products/[id]` | Admin |
| GET | `/admin/orders` | Admin |
| GET, PATCH | `/admin/orders/[id]` | Admin |
| GET | `/admin/users` | Admin |

## Storefront URLs

- `/categories` — all categories  
- `/category/[slug]` — subcategories inside that category  
- `/category/[slug]/[subSlug]` — **product list with prices** (table on desktop, cards on mobile)  
- `/product/[slug]` — product detail  

## Architecture

- **App Router** pages for storefront and admin UI.
- **Route Handlers** under `src/app/api/v1` call service modules in `src/lib/services`.
- **Mongoose** models in `src/lib/models`.
- **Auth**: JWT in `prisbo_session` httpOnly cookie (`src/lib/auth/session.ts`).

## Production

- Set `NODE_ENV=production`, strong `JWT_SECRET`, real Razorpay keys, and `RAZORPAY_WEBHOOK_SECRET`.
- Prefer hosting that supports Node (Vercel, Railway, etc.) with env vars configured in the host UI.
