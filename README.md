# Church Backend

Standalone Node.js + Express + MongoDB API for Stripe Hosted Checkout, used by the `church_01` Next.js frontend.

## Setup

```bash
cd church_backend
cp .env.example .env
# Fill in STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, MONGODB_URI
npm install
npm run dev
```

Server defaults to `http://localhost:4000`.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/payment/create-checkout-session` | Create Stripe Checkout Session |
| `POST` | `/stripe/webhook` | Stripe webhook (`checkout.session.completed`) |

## Local webhook forwarding

```bash
stripe listen --forward-to localhost:4000/stripe/webhook
```

Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

## Environment

| Variable | Description |
|----------|-------------|
| `PORT` | API port (default `4000`) |
| `MONGODB_URI` | MongoDB Atlas URI including DB name, e.g. `...mongodb.net/overflow?...` |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `FRONTEND_URL` | Frontend origin for CORS + success/cancel URLs |
| `CURRENCY` | Checkout currency (default `usd`) |
| `SHIPPING_FEE` | Flat shipping fee in dollars (default `5.99`) |

## Vercel deploy

1. In Atlas → Network Access, allow `0.0.0.0/0` (or Vercel IPs) so the serverless function can connect.
2. In the Vercel project → Settings → Environment Variables, set:

| Name | Production value |
|------|------------------|
| `MONGODB_URI` | Atlas URI with `/overflow` in the path |
| `STRIPE_SECRET_KEY` | your Stripe secret |
| `STRIPE_WEBHOOK_SECRET` | your Stripe webhook secret |
| `FRONTEND_URL` | `https://www.thehouseofoverflow.org` |
| `NODE_ENV` | `production` |
| `CURRENCY` | `usd` |
| `SHIPPING_FEE` | `5.99` |

3. Redeploy. Confirm `GET https://churchbe-rosy.vercel.app/health` returns `200`.
