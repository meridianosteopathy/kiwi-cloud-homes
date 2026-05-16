# Booking confirmation email setup

Guests get a branded "your booking is confirmed" email automatically when
the Hostaway reservation is created. This file walks through the one-time
host setup on **Brevo** (formerly Sendinblue).

## Why Brevo

- Free tier: 300 emails/day (~9,000/month) — comfortable headroom for a
  single-property booking volume
- Multiple sender domains allowed on free plan
- Handles deliverability, DKIM/SPF, bounce-tracking
- Code only depends on a single `fetch` to their API (no SDK), so swapping
  providers later is one library swap + one env-var change

## 1. Sign up at Brevo

1. Go to **https://www.brevo.com/** and click **Sign up free**
2. Use email/password or a Google account
3. Confirm the sign-up email
4. Skip the marketing onboarding wizard if it asks — we only need the
   transactional API

## 2. Add `kiwicloudhomes.co.nz` as a sending domain

In the Brevo dashboard:

1. Top-right → **your account name** → **Senders, Domains & Dedicated IPs**
   (also reachable under **Settings → Senders & IP**)
2. **Domains** tab → **Add a Domain**
3. Enter `kiwicloudhomes.co.nz` and confirm
4. Brevo shows you **2–3 DNS records** to add. Typically:
   - 1 × **TXT** record for the Brevo verification token (e.g. `@` →
     `brevo-code:<long string>`)
   - 1 × **TXT** record (DKIM) — usually `mail._domainkey` →
     `k=rsa; p=<long key>`
   - **SPF** — Brevo asks you to include `include:spf.brevo.com` in an
     SPF TXT record on the apex (`@`). If you don't already have an SPF
     record for the domain, add `v=spf1 include:spf.brevo.com mx ~all`.
     If you already have one for another sender, **merge** the include —
     never publish two SPF TXT records on the same name, that breaks SPF.

## 3. Add those DNS records in GoDaddy

Same DNS panel you used for Vercel:

1. GoDaddy → **My Products → kiwicloudhomes.co.nz → DNS**
2. **Add New Record** for each record Brevo showed:
   - For each **TXT**: Type `TXT`, Name as Brevo specifies (`@` for apex,
     `mail._domainkey` for DKIM), Value exactly as Brevo gave it, TTL
     `1 Hour`
3. Save
4. Back in Brevo → click **Authenticate** / **Verify Records**. DNS usually
   propagates within a few minutes; can take up to a few hours.

**Don't touch your existing MX records** (the inbox you receive at
`@kiwicloudhomes.co.nz`). Brevo's DKIM record uses a `_domainkey`
sub-name so it won't collide with normal email routing.

## 4. Get an API key

In Brevo dashboard:

1. Top-right → **SMTP & API** (or **Settings → SMTP & API**)
2. **API Keys** tab → **Generate a new API key**
3. Name: `kiwi-cloud-homes-prod`
4. **Copy the key** — Brevo shows it once. Looks like `xkeysib-…`

## 5. Add env vars in Vercel

**Vercel → kiwi-cloud-homes → Settings → Environment Variables → Add**:

| Key | Value |
|---|---|
| `BREVO_API_KEY` | the `xkeysib-…` you just copied |
| `EMAIL_FROM_ADDRESS` | `nina@kiwicloudhomes.co.nz` (or whatever From: you want — must be on the verified domain) |
| `EMAIL_REPLY_TO` | (optional) override; defaults to `EMAIL_FROM_ADDRESS` |

All three go into Production / Preview / Development environments.

**Redeploy** so the new env vars are picked up: Vercel → Deployments →
⋯ on the latest deployment → **Redeploy**.

## 6. Test

Run an end-to-end test booking on the live site (or a preview URL):

1. Block a fake date range in Hostaway
2. Book those dates on the website with the test Stripe card
   (`4242 4242 4242 4242`)
3. Watch, in order:
   - Stripe webhook responds 200
   - Hostaway reservation is created
   - The guest email address you used receives a "Booking confirmed"
     email within a few seconds
4. Cancel the test reservation in Hostaway

If the email doesn't arrive:

- Check spam/junk folder (especially Gmail's "Promotions" tab)
- Vercel → Logs → look for `[booking/webhook] confirmation email …`:
  - `skipped: BREVO_API_KEY not configured` → env var missing or typo
  - `failed: Brevo 401 …` → API key is wrong / revoked
  - `failed: Brevo 400 … sender not authorized` → the `EMAIL_FROM_ADDRESS`
    isn't on a verified Brevo domain yet
  - `sent: <id>` → Brevo accepted it; downstream issue (spam filter,
    wrong recipient address)
- Brevo dashboard → **Transactional → Statistics / Logs** shows every
  send attempt with delivery status

## Notes

- The email is bilingual — sends in Chinese if the guest was browsing in
  zh-CN at checkout, otherwise English. Detected from the `locale` field
  saved in Stripe metadata at PaymentIntent creation time.
- The email shows the **full property address** including the precise
  street address (which is hidden on the public listing card for privacy).
  Reasonable — they've paid and need to find the place.
- If you change the email template
  (`src/lib/email/booking-confirmation.ts`) there's nothing further to
  do in Brevo — they only host the API; templates live in our repo.
