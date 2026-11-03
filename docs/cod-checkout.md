# COD checkout

The cart lives in the browser. Orders are validated and priced from `src/data/products.ts` in a Cloudflare Worker, then saved in D1 before checkout reports success. Customer details are never stored in browser storage. Emails go to `ngvd4901@gmail.com` through Resend.

## Local development

1. Copy `.dev.vars.example` to `.dev.vars`. Set `RESEND_API_KEY` and `ORDER_EMAIL_FROM` to credentials for your Resend account and verified sending address. Never put the API key in a `NEXT_PUBLIC_` variable.
2. Run `pnpm db:migrate:local` once.
3. Run `pnpm dev:api` and `pnpm dev` in separate terminals. Next development proxies `/api/*` to the Worker on port 8787. The API development command uses `public/` for its unused asset binding, so it does not hold the production export directory open during builds.

Without email credentials, local orders are still stored, with `email_status = 'pending'`; no email has been sent. Use only test customer data locally.

Production rejects new orders with HTTP 503 until email credentials and sender are configured, so a missing setup cannot silently accept live orders without a notification path.

## Production setup (required before accepting live orders)

1. Create a D1 database: `pnpm exec wrangler d1 create coffee-shop-orders`.
2. Replace the all-zero `database_id` in `wrangler.jsonc` with the returned database ID. The current value supports local development only.
3. Run `pnpm db:migrate:remote`.
4. Set `RESEND_API_KEY` and `ORDER_EMAIL_FROM` with `pnpm exec wrangler secret put NAME`. The sender must be verified in Resend. Confirm `ORDER_NOTIFICATION_TO` in `wrangler.jsonc`.
5. Optionally configure `SHIPPING_FEE_VND` as a whole number of VND for orders below 500,000 VND. Without it, checkout explicitly says shipping will be confirmed by phone; `shipping_fee` and `total` are null. Orders at or above 500,000 VND always have free shipping.
6. Build and deploy using the existing deployment command, then place one test COD order and verify both its D1 row and notification email before sharing checkout with customers.

## Reliability

- The API ignores client prices, validates products, quantities and customer fields, and limits request size.
- A checkout UUID prevents duplicate orders on retries. Reusing a UUID with different contents returns a conflict.
- Each order stores a snapshot of item names, prices, delivery details and the notification state. Future catalog edits do not change existing orders.
- Failed email notifications remain pending. A scheduled Worker retries pending notifications every five minutes, with a stable Resend idempotency key. D1 remains the source of truth; check pending rows if the email service is unavailable.
- There is no public API for listing customer orders. Use the Cloudflare D1 console to review or export stored orders. The insert trigger allows at most ten orders per IP hash in fifteen minutes.
- This flow supports COD only; it does not collect card details or charge online payments.

To inspect pending notifications in Cloudflare D1:

```sql
SELECT order_number, created_at, email_status
FROM orders WHERE email_status = 'pending' ORDER BY created_at;
```
