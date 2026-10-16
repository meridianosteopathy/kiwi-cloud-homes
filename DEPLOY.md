# Deploying to Netlify

One-time setup, then every push to `main` auto-deploys. Pull requests get a
free preview URL.

## Why Netlify, and why not Vercel's free plan

The site used to run on Vercel's free **Hobby** plan. Vercel's Fair Use
Guidelines say Hobby is "restricted to non-commercial personal use only", and
their first example of commercial use is "any method of requesting or
processing payment from visitors of the site". A booking page with Stripe
checkout is exactly that, and Vercel may pause such a site without notice.
Staying on Vercel legitimately means the Pro plan at USD 20 a month.

Netlify's **Free** plan permits commercial projects, needs no credit card,
does not put the site to sleep between visits, supports Next.js 16 with no
special configuration, and includes a custom domain with free SSL. It is the
free host this project targets.

The one thing to understand about Netlify Free is its **monthly allowance of
300 credits**. See "Monthly credit budget" at the end before you deploy.

## 1. Before you start

- The GitHub account that owns this repo (`meridianosteopathy`) must be the
  one you sign in with. Netlify Free can import public repos and private repos
  owned by a **personal** account. It cannot import a private repo owned by a
  GitHub **organisation** (that needs Pro). If the import step cannot see the
  repo, this is why.
- Have your `.env.local` values to hand (Hostaway, Brevo, Stripe test keys).
- Have the Stripe Dashboard open in **Test mode**.

## 2. Sign up and import the repo

1. Go to **https://app.netlify.com/signup** and sign up with GitHub.
2. Choose the **Free** plan. No card is asked for.
3. On the team dashboard click **Add new project → Import an existing
   project → GitHub**. Authorise Netlify for the `kiwi-cloud-homes` repo.
4. Netlify detects Next.js. The build command (`npm run build`) and publish
   directory (`.next`) come from the committed `netlify.toml`. Leave them.
   Check the **Branch to deploy** is `main`. Netlify defaults to the
   repository's default branch, which in this repo is still an old
   `claude/...` branch, so change it to `main` if it is not already.
5. **Do not deploy yet.** Add the environment variables first (next step).
   Every production deploy costs 15 credits, so get the first one right.

## 3. Add environment variables

On the import screen open **Add environment variables** (or afterwards:
**Project configuration → Environment variables → Add a variable**).

For each variable:

- **Scopes:** leave on **All scopes**. Serverless functions only see
  variables whose scope includes *Functions*, and `NEXT_PUBLIC_…` variables
  are baked in at build time so they also need *Builds*. "All scopes" covers
  both.
- **Deploy contexts:** **Same value for all deploy contexts** unless you
  deliberately want different test and live values.

| Key | Value | Used in |
|---|---|---|
| `BOOKING_BACKEND` | `hostaway` while Hostaway is still the engine; `beds24` after the switch (see below) | Chooses the booking engine |
| `BEDS24_REFRESH_TOKEN` | from `npm run beds24:setup` (only when `BOOKING_BACKEND=beds24`) | Beds24 API |
| `BEDS24_PROPERTY_IDS` *(optional)* | **Leave empty** to show every property in the Beds24 account | Beds24 API |
| `BEDS24_PRICE_SLOT` *(optional)* | **Leave empty** unless a house sells a daily price other than the one enabled for Beds24's own booking page | Beds24 API |
| `HOSTAWAY_USE_MOCK` | `false` (type it literally); only matters while the engine is Hostaway | Switches to live Hostaway |
| `HOSTAWAY_ACCOUNT_ID` | from `.env.local` | Hostaway API |
| `HOSTAWAY_CLIENT_ID` | from `.env.local` | Hostaway API |
| `HOSTAWAY_CLIENT_SECRET` | from `.env.local` | Hostaway API |
| `HOSTAWAY_LISTING_IDS` *(optional)* | **Leave empty** to show every house in your Hostaway account (see below) | Hostaway API |
| `INQUIRY_EMAIL` | `nina@kiwicloudhomes.co.nz` | inquiry mailto link; owner alert when a payment cannot be booked |
| `NEXT_PUBLIC_SITE_URL` | the site's public address, e.g. `https://kiwicloudhomes.co.nz` (use the `.netlify.app` URL until the domain is live) | social-share preview links |
| `BREVO_API_KEY` | from `.env.local` | confirmation email |
| `EMAIL_FROM_ADDRESS` | `nina@kiwicloudhomes.co.nz` | confirmation email |
| `EMAIL_REPLY_TO` *(optional)* | reply address | confirmation email |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` to start | Stripe checkout |
| `STRIPE_SECRET_KEY` | `sk_test_…` to start | Stripe checkout |
| `STRIPE_WEBHOOK_SECRET` | **skip for now**, added in step 5 | Stripe webhook |

Never put any of these in `netlify.toml`: values there are not visible to
functions, and the file is public in the repo.

### Which houses show on the site

By default, **every listing in your Hostaway account**. Import a house into
Hostaway and it appears on `/tourist` and `/school` within about five minutes,
bookable, with its own calendar and price. No redeploy, no code change.

Two things to watch:

- **If the old `HOSTAWAY_LISTING_ID` variable is set** (from the single-house
  days) the site shows only that one house. Do not carry it over to Netlify.
  To pin the set, use `HOSTAWAY_LISTING_IDS` with the full comma-separated
  list instead.
- **To hide a house** you have in Hostaway but do not want on the website,
  set `HOSTAWAY_LISTING_IDS` to just the ids you *do* want. The order you
  write them is the order they appear. A house not on the list cannot be
  quoted or booked through the site.

To find a listing id: open the house in the Hostaway dashboard and read it off
the address bar: `.../listings/123456`.

### Switching the booking engine to Beds24

The site can run on either engine. The switch is a settings change plus a
small edit to the per-home file, with no code change:

1. **Get a Beds24 refresh token.** In Beds24 go to **Settings → Marketplace →
   API** (the page at `beds24.com/control3.php?pagetype=apiv2`) and generate
   an invite code with these scopes: **read:properties**, **read:inventory**
   (calendar and prices), **all:bookings**, **all:bookings-personal** (guest
   names and emails) and **all:bookings-financial** (the payment line). Leave
   property access on **all properties**: a token tied to one property would
   show only that house, and the setup script warns if that happened. The
   code works once and expires after 24 hours. Exchange it from your computer:

   ```
   npm run beds24:setup -- <invite code>
   ```

   It prints the refresh token and checks its scopes. (Alternative without a
   terminal: open https://beds24.com/api/v2, find **GET /authentication/setup**,
   click *Try it out*, paste the code into the `code` header, execute, and copy
   `refreshToken` from the response.) Do not use a "long life token" from the
   same page for production: Beds24 makes those read-only, so the site could
   show the houses but never write a booking.
2. **Find each house's Beds24 property id** (Settings → Properties; the number
   in the address bar). Add it to that house's `match` list in
   `src/content/homes.ts`, and fill in `bedrooms` and `bathrooms` there,
   because Beds24 has no fields for them. If Beds24 returns no photos for a
   house, add `images` there too. Commit and merge.
3. **Netlify variables:** set `BOOKING_BACKEND` to `beds24` and add
   `BEDS24_REFRESH_TOKEN`. Leave `BEDS24_PROPERTY_IDS` empty unless you want
   to hide a property or fix the order. The Hostaway variables can stay until
   the Hostaway account is closed; they are ignored while the engine is Beds24.
4. **Deploys → Trigger deploy → Deploy project.**
5. Check `/tourist`: both houses, real prices and calendar from Beds24. The
   site sells the room's **daily prices** (Settings → Properties → Rooms →
   Daily prices, or the Calendar price grid); a date with no price is shown
   but not bookable. It sells **one price slot** as a flat nightly rate (the
   first one enabled for the Beds24 booking page, or `BEDS24_PRICE_SLOT`);
   conditions on that price (minimum stay, lead time, per-person pricing)
   and extra-person charges are not applied, so keep the sold slot a plain
   nightly price. The cleaning fee is the property's enabled one-off
   *obligatory cleaning* upsell item (Booking page → Upsell items), falling
   back to the room's cleaning-fee field; other compulsory upsell items are
   not charged (the function log says so), so fold them into the nightly
   price or the cleaning fee. Per-date minimum stays, no-check-in and
   no-check-out days from the Beds24 calendar are honoured. If a house shows
   no photos, add them to `src/content/homes.ts`. Then run the end-to-end
   test booking (section 6) and confirm the booking appears in Beds24 with
   source *Kiwi Cloud Homes website*, the Stripe payment reference (`pi_…`)
   in its notes and `custom1` field, an accommodation charge, a cleaning-fee
   charge and a payment line, and that the dates block on Airbnb and
   Booking.com through Beds24.

To go back, set `BOOKING_BACKEND` to `hostaway` and redeploy.

## 4. Deploy and check

Click **Deploy**. About two minutes later you get a URL like
`https://something-random.netlify.app`. You can rename the `something-random`
part under **Project configuration → Project details → Change project name**.

Open the URL and check:

- The language picker appears and choosing a language redirects you to
  `/en` or `/zh-CN`. If this works, the Next.js proxy (locale routing) is
  running on Netlify.
- `/tourist` shows every house you expect, each with its own price and
  "Book your stay" panel, not the mock "Halswell Garden Retreat". If you see
  mock data, `BOOKING_BACKEND` is not set to the engine you meant. If you see
  an error page instead, one of that engine's variables is missing or wrong:
  **Logs → Functions** shows the message (for Beds24, a line naming
  `BEDS24_REFRESH_TOKEN`) and a `[booking] backend: ...` line saying which
  engine ran; both appear on the first page view, not in the deploy log. Fix
  it, then **Deploys → Trigger deploy → Deploy project**. Env var changes
  only take effect on the next deploy.

## 5. Create the Stripe test webhook

1. Stripe Dashboard → **Test mode** on → **Developers → Webhooks → Add
   endpoint**.
2. **Endpoint URL:** `https://YOUR-NETLIFY-URL/api/booking/webhook`
3. **Listen to:** `payment_intent.succeeded` (only that one).
4. **Add endpoint**, then **Reveal** the signing secret and copy the
   `whsec_…` value.
5. Netlify → **Project configuration → Environment variables → Add a
   variable**: key `STRIPE_WEBHOOK_SECRET`, value the `whsec_…`, all scopes.
6. **Deploys → Trigger deploy → Deploy project**.

## 6. End-to-end test

1. In the booking engine the site is running on (Hostaway, or Beds24 after
   the switch), **block off a fake date range** (a month two years out). The
   first successful test booking creates a real reservation on your real
   calendar, and the engine pushes it to Airbnb and Booking.com.
2. Open `https://YOUR-NETLIFY-URL/tourist`, pick those dates, **Book now**,
   fill in name and email, **Continue to payment**.
3. Pay with the Stripe test card `4242 4242 4242 4242`, any future expiry,
   any CVC.
4. Check, in this order:
   - **Stripe → Payments**: the test payment is recorded.
   - **Stripe → Webhooks → your endpoint**: the `payment_intent.succeeded`
     event shows a **200** response. This is the key check. A **400** with
     "Invalid signature" means the webhook secret is wrong or the raw body
     is not reaching the function; stop and report it.
   - **Hostaway → Reservations** (or **Beds24 → Bookings** after the switch):
     a new reservation carrying the Stripe payment intent id.
   - The guest email address receives the confirmation email.
5. Cancel the test reservation in that same engine.

If a payment succeeds but the booking cannot be written (the nights were
taken on another channel in the meantime, or the listing is unknown to the
engine), the site emails `INQUIRY_EMAIL` an **ACTION NEEDED** alert with the
payment id, guest and dates, and the Stripe event shows **200**. Refund the
guest in Stripe or create the booking by hand. If that alert cannot be sent
(Brevo not configured), the event stays red in Stripe and keeps retrying so
the failure is not lost.

If anything fails, **Netlify → Logs → Functions** shows the server-side
log lines (`[booking/webhook] …`). Look soon after the failure; free-plan
logs are kept only briefly.

## 7. Custom domain

1. Netlify → **Domain management → Add a domain** → enter
   `kiwicloudhomes.co.nz` (Netlify adds `www` as well).
2. Netlify shows you the DNS records to create. Two ways to do it:
   - **Keep GoDaddy DNS (recommended, nothing else changes):** in GoDaddy →
     **My Products → kiwicloudhomes.co.nz → DNS**, add exactly the records
     Netlify shows (an `A` or `ALIAS` record for the apex and a `CNAME` for
     `www`). Remove the old records that pointed at Vercel.
   - **Or move DNS to Netlify:** change the nameservers at GoDaddy to the
     ones Netlify lists. Only do this if you are comfortable re-entering your
     existing mail (MX) and Brevo (TXT) records in Netlify DNS.
3. **Do not touch the MX records** or the Brevo TXT records. Your email and
   confirmation-email sending depend on them.
4. Back in Netlify, **Verify DNS configuration**, then under **HTTPS** wait
   for the free Let's Encrypt certificate. DNS can take up to a day to settle.

## 8. Going live

1. **Stripe:** toggle off Test mode → **Developers → API keys**: copy the
   **live** publishable and secret keys.
2. **Stripe (live mode):** **Webhooks → Add endpoint** with the same URL
   (now on your real domain) and the same `payment_intent.succeeded` event.
   Copy the live `whsec_…`.
3. **Netlify:** update the three Stripe variables to the live values.
4. **Deploys → Trigger deploy → Deploy project**.
5. Make one real low-value booking and refund it in Stripe to prove the live
   path works.

## 9. Switch off Vercel

Once the domain resolves to Netlify and a live booking has worked:

1. Vercel → the `kiwi-cloud-homes` project → **Settings → Domains** →
   remove `kiwicloudhomes.co.nz`.
2. **Settings → General → Delete Project**.
3. Delete the old Stripe webhook endpoints that point at the Vercel URL.

## Monthly credit budget

Netlify Free gives **300 credits per month**. Everything draws from that pool
and nothing is billed: when the credits run out, every site on the account
shows a "Site not available" page until the next month, and Stripe webhooks
cannot be received while it is paused. Netlify emails you at 50, 75, 90 and
100 percent.

| What | Credits |
|---|---|
| One successful **production** deploy | 15 |
| 1 GB of bandwidth served | 20 |
| 10,000 web requests | 2 |
| Function compute (server-rendered pages, API routes) | 10 per GB-hour, small for this site |
| Preview deploys, failed deploys, rollbacks | 0 |

What that means for one property with light traffic:

- Aim for **no more than 5 to 8 production deploys a month** (75 to 120
  credits). Test on pull-request previews, which are free, and merge changes
  in batches.
- Photos are served from Hostaway's image CDN, not from Netlify, so bandwidth
  is mostly the pages themselves. A few thousand page views a month is
  roughly 40 to 80 credits.
- Check **Team settings → Usage** once a month.
- If the allowance ever runs short, Netlify's **Personal** plan is USD 9 a
  month for 1,000 credits, or the **Pro** plan is USD 20 for 3,000.

## Notes

- **Region:** on the Free plan, server code runs in Netlify's US East (Ohio)
  region and cannot be moved. Pages render a few hundred milliseconds slower
  for New Zealand visitors than on Vercel's Sydney region. Static files still
  come from Netlify's global CDN.
- **Env var changes do not redeploy automatically.** After changing any
  variable, **Deploys → Trigger deploy → Deploy project** (15 credits).
- **Build minutes** are not metered separately on the credit plans; only
  successful production deploys cost credits.
- **China access:** Netlify, like Vercel, may be slow or blocked from
  mainland China. Long-term, consider a China-accessible host for Chinese
  visitors inside the firewall.
- The `netlify.toml` in the repo pins only the build command, output
  directory and Node version. Netlify installs and updates its Next.js
  adapter itself.
