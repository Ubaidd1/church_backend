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
| `MONGODB_URI` | MongoDB connection string |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `FRONTEND_URL` | Frontend origin for CORS + success/cancel URLs |
| `CURRENCY` | Checkout currency (default `usd`) |
| `SHIPPING_FEE` | Flat shipping fee in dollars (default `5.99`) |
