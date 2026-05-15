# Booking confirmation email setup

Guests get a branded "your booking is confirmed" email automatically when the
Hostaway reservation is created. This file walks through the one-time host
setup on Resend.

## Why Resend

- Free tier: 3,000 emails/month (well above realistic booking volume for a
  single property)
- Resend handles deliverability, DKIM/SPF, bounce-tracking
- The site code only depends on the Resend SDK — swapping providers later is
  one env-var change + one library swap

## 1. Sign up at Resend

1. Go to **https://resend.com/signup**
2. Sign up with your GitHub account or an email/password
3. Verify the sign-up email if asked

## 2. Add `kiwicloudhomes.co.nz` as a sending domain

In Resend dashboard:

1. Sidebar → **Domains** → **Add Domain**
2. Enter `kiwicloudhomes.co.nz`
3. Pick **Region: Asia Pacific (Sydney)** for closest to your NZ audience
4. Resend shows **3 DNS records** to add — typically:
   - 1 × MX record (e.g. `send` → `feedback-smtp.ap-southeast-2.amazonses.com`)
   - 1 × TXT record (SPF, e.g. `send` → `v=spf1 include:amazonses.com ~all`)
   - 1 × TXT record (DKIM, e.g. `resend._domainkey` → very long string)

## 3. Add those DNS records in GoDaddy

Same DNS panel you used for Vercel:

1. GoDaddy → **My Products → kiwicloudhomes.co.nz → DNS**
2. **Add New Record** for each of the three Resend gave you:
   - For the **MX**: Type `MX`, Name `send`, Value/Server the host Resend
     showed, Priority `10`, TTL `1 Hour`
   - For the **SPF TXT**: Type `TXT`, Name `send`, Value the `v=spf1 …`
     string, TTL `1 Hour`
   - For the **DKIM TXT**: Type `TXT`, Name `resend._domainkey`, Value the
     long DKIM string, TTL `1 Hour`
3. Save
4. Back in Resend → click **Verify DNS records**. Usually verifies within
   a few minutes; can take up to a few hours.

**Don't touch your existing MX records for email** (if `kiwicloudhomes.co.nz`
is also where your inbox lives). The new MX is on the `send` subdomain
specifically — it doesn't conflict with `@`/apex MX.

## 4. Get an API key

In Resend dashboard:

1. Sidebar → **API Keys** → **Create API Key**
2. Name: `kiwi-cloud-homes-prod` (or whatever)
3. Permission: **Full access** (or "Sending access" if you want least-privilege)
4. **Copy the key** — Resend shows it once. Looks like `re_…`

## 5. Add env vars in Vercel

**Vercel → kiwi-cloud-homes → Settings → Environment Variables → Add**:

| Key | Value |
|---|---|
| `RESEND_API_KEY` | the `re_…` you just copied |
| `EMAIL_FROM_ADDRESS` | `nina@kiwicloudhomes.co.nz` (or whatever From: you want — must be on the verified domain) |
| `EMAIL_REPLY_TO` | (optional) override; defaults to EMAIL_FROM_ADDRESS |

All three go into all three environments (Production / Preview / Development).

**Redeploy** so the new env vars are picked up: Vercel → Deployments → ⋯ on
latest → **Redeploy**.

## 6. Test

Run an end-to-end test booking on the live site (or preview URL):

1. Block a fake date in Hostaway
2. Book those dates on the website with the test Stripe card
3. Watch:
   - Stripe webhook responds 200
   - Hostaway reservation is created
   - The guest email address you used receives a "Booking confirmed" email
     within a few seconds
4. Cancel the test reservation in Hostaway

If the email doesn't arrive:

- Check spam/junk folder
- Vercel → Logs → look for `[booking/webhook] confirmation email …` lines:
  - `skipped: RESEND_API_KEY not configured` → env var missing or typo
  - `failed: …` → Resend rejected the send (often domain not yet verified
    or wrong From address)
  - `sent: re_…` → Resend accepted; the issue is downstream (spam filter,
    wrong recipient address)
- Resend → **Emails** tab shows every send attempt with delivery status

## Notes

- The email is bilingual — sends in Chinese if the guest was browsing in
  zh-CN at checkout, otherwise English. Detected from the `locale` field
  saved in Stripe metadata at PaymentIntent creation time.
- The email shows the **full property address** including the precise
  street address (which is hidden on the public listing card for privacy).
  Reasonable — they've paid and need to find the place.
- If you change the email template (`src/lib/email/booking-confirmation.ts`)
  there's nothing further to do in Resend — they only host the API; templates
  live in our repo.
