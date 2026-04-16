# BOD — Business Operations Dashboard API

Backend (single-company deployment) for an internal B2B operations dashboard: customers, suppliers, inventory, sales, purchases, invoices, payments (including Paystack), expenses, notifications, audit logs, and reporting.

## Stack

- Node.js, **Express 5**, **TypeScript**
- **MongoDB** + **Mongoose**
- **JWT** access + refresh tokens, **bcrypt** password hashing
- **Multer** uploads (stored under `./uploads`, served at `/uploads/...`)
- **Nodemailer** + Pug templates for transactional email
- **Paystack** REST API for hosted checkout and webhooks

## Prerequisites

- Node.js 20+
- MongoDB 6+ (Atlas or self-hosted)

## Setup

1. **Fix `node_modules` permissions** if you previously ran the dev server with `sudo` (otherwise `npm install` may fail):

   ```bash
   sudo chown -R "$(whoami)" node_modules
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment file and fill in values:

   ```bash
   cp .env.example .env
   ```

4. **Bootstrap** (first run only):

   - `POST /api/v1/auth/register` — creates the first owner user and company when **no users and no company** exist (disabled after that).
   - Or run `npm run seed` when the database is empty (uses `SEED_*` variables from `.env`).

5. **Development** (removed `sudo` from the dev script — use a port ≥ 1024 or grant bind permission if you need port 80):

   ```bash
   npm run dev
   ```

6. **Production build**:

   ```bash
   npm run build
   npm start
   ```

## Environment variables

See `.env.example`. Important:

| Variable | Purpose |
|----------|---------|
| `DATABASE` / `DATABASE_PASSWORD` | Mongo connection string (password may replace `<password>` in `DATABASE`) |
| `JWT_SECRET` | Signing key for access tokens |
| `JWT_REFRESH_SECRET` | Optional; defaults to `JWT_SECRET` if unset |
| `API_URL` | Public base URL of this API (used for upload URLs) |
| `FRONTEND_URL` | CORS + password reset links |
| `PAYSTACK_*` | Server-side key and webhook verification |
| Email | SMTP for password reset and mailers |

## API overview

Base path: **`/api/v1`**

| Prefix | Module |
|--------|--------|
| `/auth` | Register (bootstrap), login, refresh, logout, password reset, profile |
| `/users` | Staff users, roles, permissions |
| `/company` | Single company profile and settings |
| `/customers`, `/suppliers` | CRM |
| `/products`, `/services` | Catalog |
| `/inventory` | Stock in/out, adjustments, transfers, movements, low stock |
| `/quotations`, `/invoices` | Quotes and invoices (convert quote → invoice) |
| `/payments` | Manual payments, Paystack init, verify |
| `/payments/paystack/webhook` | Raw-body Paystack webhook (mounted before JSON parser) |
| `/sales` | POS-style sales with optional inventory deduction |
| `/purchase-orders` | POs, approve, receive (updates stock) |
| `/expenses` | Expenses with approve/reject |
| `/notifications` | In-app notifications |
| `/dashboard` | Aggregated stats |
| `/audit-logs` | Audit trail |
| `/uploads` | Multipart upload (logo, avatars, receipts, etc.) |
| `/system` | Key/value system settings document |

## Scripts

| Script | Command |
|--------|---------|
| Dev | `npm run dev` |
| Build | `npm run build` |
| Start | `npm start` |
| Seed | `npm run seed` |
| Typecheck | `npm run typecheck` |

## Transactional email (Pug)

Templates live in `src/views/email/`. SMTP must be set (`EMAIL_HOST`, `EMAIL_ADDRESS`, `EMAIL_PASSWORD`, etc.).

| Template | When |
|----------|------|
| `passwordReset.pug` | Forgot-password flow |
| `welcome.pug` | Welcome mail (if you call `Email.sendWelcome`) |
| `staffInvitation.pug` | New staff user created (`/users` invite) |
| `invoiceSent.pug` | Invoice marked **sent** (customer must have an email; company `notificationSettings.emailEnabled`) |
| `paymentReceived.pug` | Completed payment with customer + allocations (`sendPaymentConfirmations` must be on) |
| `quotationSent.pug` | Quotation status changes **to** `sent` |
| `expenseStatus.pug` | Expense approved or rejected (submitter must have email; respects user `notificationPreferences.email`) |

Helpers: `src/utils/email.ts` (`sendTemplatedMail`, `isEmailConfigured`) and `src/services/emailNotifications.service.ts`. Failures are logged and do not fail the API request.

## Notes

- **Single tenant**: one `Company` document per deployment; numbering uses `invoiceSettings`, `quotationSettings`, etc.
- **Paystack**: initialize payment for an invoice via `POST /api/v1/payments/invoices/:id/initialize`; configure the webhook URL in the Paystack dashboard to `https://<your-api>/api/v1/payments/paystack/webhook`.
- **Files**: uploads live under `./uploads`; optional Backblaze B2 can be wired later (env placeholders in `.env.example`).
- **Rate limiting**: simple in-memory limiter on auth routes (replace with Redis for multi-instance production).

## Manual configuration

- Real **SMTP** credentials for transactional email.
- **Paystack** live keys and webhook secret for production.
- **MongoDB** network access and strong `DATABASE_PASSWORD`.
