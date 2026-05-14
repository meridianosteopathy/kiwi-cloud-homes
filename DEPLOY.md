# Deploying to Vercel

One-time setup, then every push to `main` auto-deploys.

## 1. Sign up + import the repo

1. Go to **https://vercel.com/signup** and sign up with your GitHub account
   (the same one that owns this repo — `meridianosteopathy`).
2. From the Vercel dashboard, click **Add New… → Project**.
3. Find **kiwi-cloud-homes** in the list of GitHub repos and click **Import**.
4. The framework should auto-detect as **Next.js**. Region is pinned to
   **Sydney (syd1)** via the committed `vercel.json` — best latency for NZ
   visitors. Leave the build/output settings alone.
5. **Don't deploy yet.** Add the env vars first (next step) — otherwise the
   first build will succeed but the live site will error trying to reach
   Hostaway / Stripe.

## 2. Add environment variables

Still on the import screen, scroll down to **Environment Variables**.

Add each of these — use the same values you have in your local `.env.local`,
EXCEPT for the Hostaway flag which must be `false` for the live site:

| Key | Where to get the value | Used in |
|---|---|---|
| `HOSTAWAY_USE_MOCK` | Type `false` literally | Switches to live Hostaway |
| `HOSTAWAY_ACCOUNT_ID` | Your `.env.local` | Hostaway API |
| `HOSTAWAY_CLIENT_ID` | Your `.env.local` | Hostaway API |
| `HOSTAWAY_CLIENT_SECRET` | Your `.env.local` | Hostaway API |
| `HOSTAWAY_LISTING_ID` *(optional)* | Your `.env.local` | Hostaway API |
| `INQUIRY_EMAIL` | `nina@kiwicloudhomes.co.nz` | mailto inquiry form |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Your `.env.local` (start with the **test** key) | Stripe checkout |
| `STRIPE_SECRET_KEY` | Your `.env.local` (test) | Stripe checkout |
| `STRIPE_WEBHOOK_SECRET` | **Skip for now** — we'll add this after the first deploy when we create the Stripe webhook endpoint pointing at your Vercel URL | Stripe webhook |

For each row: paste the **Key** and **Value**, click **Add**. Leave the
"Environment" dropdowns set to all three (Production / Preview / Development).

## 3. Deploy

Click **Deploy**. ~2 minutes later you'll get a URL like
`https://kiwi-cloud-homes-xxxx.vercel.app` (assigned by Vercel — yours will
include a random-ish suffix).

Open it. You should see the language picker and the persona selector.
Click into `/tourist` and verify the real Hostaway listing renders.

## 4. Create the Stripe webhook (now that we have a URL)

1. In Stripe Dashboard → **Test mode** toggle on → **Developers → Webhooks
   → Add endpoint**.
2. **Endpoint URL**: `https://YOUR-VERCEL-URL/api/booking/webhook`
   (replace YOUR-VERCEL-URL with the one Vercel gave you).
3. **Listen to**: `payment_intent.succeeded` (just that one).
4. Click **Add endpoint**. On the resulting detail page, click **Reveal**
   next to "Signing secret" and copy the `whsec_…` value.
5. Back in Vercel: **Project → Settings → Environment Variables → Add**.
   - Key: `STRIPE_WEBHOOK_SECRET`
   - Value: the `whsec_…` you just copied
6. Trigger a redeploy: Vercel → **Deployments → ⋯ on the latest → Redeploy**.
   (Vercel only picks up new env vars on the next build.)

## 5. End-to-end test on production

Same as the local test plan, but against the Vercel URL:

1. In Hostaway, **block off a fake date range** (e.g. some month 2 years
   out). The first successful test booking creates a real reservation on
   your real calendar.
2. Open `https://YOUR-VERCEL-URL/tourist`, pick those test dates, click
   **Book now**, fill in name/email, **Continue to payment**.
3. Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC.
4. After the success screen, verify in:
   - **Stripe Dashboard → Payments**: the test payment is recorded
   - **Stripe Dashboard → Webhooks → your endpoint**: the
     `payment_intent.succeeded` event shows a `200` response (= our
     webhook accepted it)
   - **Hostaway → Reservations**: a new reservation exists with the
     `channelReservationId` matching the Stripe payment intent id
5. Cancel the test reservation in Hostaway when you're done.

## 6. Going live (when you're ready)

When the test flow is solid:

1. **Stripe**: toggle off Test mode in the dashboard. **Developers → API
   keys**: copy your **live** publishable + secret keys.
2. **Stripe**: in live mode, **Webhooks → Add endpoint** again — same URL,
   same `payment_intent.succeeded` event. Copy the live `whsec_…`.
3. **Vercel**: update the three Stripe env vars to the **live** values:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `pk_live_…`
   - `STRIPE_SECRET_KEY` → `sk_live_…`
   - `STRIPE_WEBHOOK_SECRET` → live `whsec_…`
4. **Redeploy** to pick up the new env vars.
5. The site now takes real bookings with real payments.

## Custom domain (optional)

Vercel → **Project → Settings → Domains → Add**. Point your domain at
Vercel's nameservers (or add a CNAME). Free SSL is automatic.

## Notes

- **Region**: `vercel.json` pins serverless functions to Sydney (`syd1`).
  Lowest latency for NZ users and for Hostaway's AU/US data centres. Edit
  `vercel.json` if you want elsewhere.
- **China access**: Vercel is blocked in mainland China. For Chinese
  visitors inside the firewall, this URL won't load. Long-term, consider
  a China-accessible host (Alibaba Cloud, Tencent Cloud, Cloudflare
  Workers with a China-region setup).
- **Auto-deploys**: every push to `main` triggers a production deploy
  automatically. Every PR gets its own preview URL (visible in the PR's
  Vercel comment).
- **Env var changes don't redeploy automatically.** After changing any env
  var in Vercel, manually trigger a redeploy (Deployments → ⋯ → Redeploy).
