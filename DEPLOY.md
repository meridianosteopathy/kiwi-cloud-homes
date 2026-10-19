# Deploying to Vercel

The site runs on Vercel's free **Hobby** plan, in the existing project
`kiwi-cloud-homes`. Every push to `main` deploys production; every pull
request gets a preview URL (posted by the Vercel bot on the PR).

**About the free plan.** Vercel's Fair Use Guidelines say Hobby is for
personal, non-commercial use, and their clearest example of commercial use is
taking payments from visitors. This site takes no payments: it shows the
houses and sends inquiries by email, so the plan is kept. If paid direct
bookings are ever turned back on, move first: Netlify's free plan permits
commercial sites (the Netlify version of this guide is in the history of pull
request #30), or use Vercel Pro at USD 20 a month.

## 1. The Vercel project

The project already exists under the team that imported this repository.
Two settings to check once:

- **Settings → Git → Production Branch** must be `main`. The repository's
  default branch on GitHub is still an old `claude/...` branch, and Vercel
  follows the default unless told otherwise.
- **Region** is pinned to Sydney (`syd1`) by the committed `vercel.json`,
  which is the closest region to New Zealand.

## 2. Environment variables

**Settings → Environment Variables → Add.** Tick **Production** and
**Preview** so pull-request previews behave like the live site. Vercel only
reads variables at build time, so after adding or changing one trigger a
redeploy: **Deployments → ⋯ on the latest → Redeploy**.

| Key | Value | Used for |
|---|---|---|
| `BOOKING_BACKEND` | `standalone` | No booking engine: house facts from `src/content/homes.ts`, taken dates from the iCal feeds below, inquiries by email, no checkout |
| `ICAL_HALSWELL` | the Hospitable iCal export link of the Modern Home (see section 3) | Greys out taken dates |
| `ICAL_BEALEY_AVE` | the Hospitable iCal export link of the Super king bed home | Greys out taken dates |
| `INQUIRY_EMAIL` | `nina@kiwicloudhomes.co.nz` | Where inquiries arrive; also the owner alert address |
| `EMAIL_FROM_ADDRESS` | a sender address verified in Brevo (see `EMAIL.md`) | Inquiry and confirmation emails |
| `BREVO_API_KEY` | from Brevo → SMTP & API | Sending email |
| `EMAIL_REPLY_TO` *(optional)* | reply address for the guest's confirmation | Defaults to `INQUIRY_EMAIL` |
| `NEXT_PUBLIC_SITE_URL` *(optional)* | `https://kiwicloudhomes.co.nz` once the domain is live, full form with `https://` | Absolute links on share cards; unset, Vercel's production hostname is used |

Variables from the Hostaway and Stripe days (`HOSTAWAY_*`, `STRIPE_*`,
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`) are not used in standalone mode and can
be deleted. Keep them only if paid bookings come back (section 6).

### Running without a booking engine (standalone mode)

This is the current setup: Hospitable's free plan is the inbox and calendar
for Airbnb and Booking.com, and the website shows the houses, greys out taken
dates and takes inquiries by email. Nothing is paid online.

1. **House facts live in `src/content/homes.ts`.** Each house has a `name`,
   bedrooms, bathrooms, `maxGuests`, `fromPrice`, amenities, address, photos
   and both descriptions. A house with no `fromPrice` shows "price on
   request". Edit, commit and merge; the site updates on the next deploy.
2. **Taken dates come from iCal links.** In Hospitable go to **Properties →
   the house → Export calendar → Copy iCal link** (confirmed available on the
   free Essentials plan, October 2026; the link looks like
   `https://api.hospitable.com/v1/properties/reservations.ics?key=…&token=…`).
   In Vercel add a variable per house named after its key, `ICAL_HALSWELL`
   (Modern Home) and `ICAL_BEALEY_AVE` (Super king bed), with the link;
   several links can be comma-separated, so Airbnb's own export link can be
   added as a second source. The links contain a secret and the feed carries
   guest names, so they go only into Vercel, never into the repo, chat or
   email; the website reads them on the server and shows nothing but taken
   dates. If a link is ever shared anywhere else, use Hospitable's *Revoke
   calendar access* (the three-dots menu next to the link) and paste the new
   link into Vercel.

   Two things to know about Hospitable's feed: it refreshes about every 40
   minutes, and the site re-reads it every ten, so a booking made on Airbnb
   can show as free here for up to an hour; and it contains **reservations,
   Owner Stays and Manual Bookings only**, not plain manual blocks. So record
   your own stays in Hospitable as an *Owner Stay* (which also blocks Airbnb
   and Booking.com), and when a website inquiry becomes a booking, enter it
   as a *Manual Booking*. For anything else, list the nights under
   `blockedDates` in `src/content/homes.ts`. If a feed cannot be read at
   all, the date picker says so instead of guessing, and the inquiry still
   goes through. The inquiry step is always where you confirm.
3. **Inquiries arrive by email.** With `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS`
   and `INQUIRY_EMAIL` set, the "Send message" button emails you the guest's
   dates and message with the guest as reply-to, and sends the guest a short
   confirmation in their language (their own message is not echoed back, so
   the form cannot be used to relay spam). If Brevo is not configured the
   dialog explains that and opens the guest's own mail app instead.
4. **Stripe is not used** in this mode: the checkout is hidden and the
   payment route refuses requests. The Stripe variables can stay empty.
5. Check `/tourist`: both houses, "price on request" or the from-price, taken
   dates greyed out in the date picker, and a test message that reaches your
   inbox (reply to it: the reply goes to the guest).

**Moving the channels from Hostaway to Hospitable.** Booking.com allows one
connected software per listing, so for each house: in the Booking.com
extranet open **Connectivity provider**, disconnect Hostaway and remove any
imported iCal calendars; then connect the listing from Hospitable using its
Booking.com accommodation ID. Hospitable says the switch can take up to ten
minutes and that dates can open up in the gap, so close the listing to new
bookings while you switch and check the calendar afterwards. Past Booking.com
bookings do not come across, only current and future ones. Connect Airbnb
from Hospitable as well. When you choose the free Essentials plan you may be
asked for a card; it is only charged if you switch on paid extras (Dynamic
Pricing, guest verification, security deposits, upsells), so leave those
off. Support on the free plan is Hospitable's AI assistant and the community
forum, not a human.

## 4. Deploy and check

Push to `main` (merging the pull request does that), or **Deployments → ⋯ on
the latest → Redeploy** after changing variables. About two minutes later
open the production URL and check:

- The language picker appears and choosing a language redirects you to
  `/en` or `/zh-CN`.
- `/tourist` shows both houses with their photos, bedrooms and either the
  from-price or "price on request", a date picker that greys out taken
  nights, and a **Send message** button. No "Book now".
- Send yourself a test message: it arrives at `INQUIRY_EMAIL` with the
  guest's address as reply-to, and the guest address gets a short
  confirmation.
- If you see the mock "Halswell Garden Retreat" instead, `BOOKING_BACKEND`
  is not set to `standalone`. If the date picker says availability could not
  load, a feed link is wrong or unreachable: **Vercel → Project → Logs**
  shows a `[standalone]` line saying which.

## 5. Custom domain

Vercel → **Settings → Domains → Add** → enter `kiwicloudhomes.co.nz` (add
`www` too). Vercel shows the DNS records to create. Keep GoDaddy as the DNS
host and add exactly those records under **My Products →
kiwicloudhomes.co.nz → DNS**. SSL is automatic. Then set
`NEXT_PUBLIC_SITE_URL` to `https://kiwicloudhomes.co.nz` and redeploy.

## 6. If paid bookings come back

Everything below is already in the codebase but switched off. Before turning
it on, read the note about Vercel's free plan at the top: a site that takes
payments has to move to Netlify Free or Vercel Pro first.

### Switching the booking engine to Beds24 (only if paid bookings come back)

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
3. **Vercel variables:** set `BOOKING_BACKEND` to `beds24` and add
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

## 5. Create the Stripe test webhook

1. Stripe Dashboard → **Test mode** on → **Developers → Webhooks → Add
   endpoint**.
2. **Endpoint URL:** `https://YOUR-VERCEL-URL/api/booking/webhook`
3. **Listen to:** `payment_intent.succeeded` (only that one).
4. **Add endpoint**, then **Reveal** the signing secret and copy the
   `whsec_…` value.
5. Vercel → **Settings → Environment Variables → Add**: key
   `STRIPE_WEBHOOK_SECRET`, value the `whsec_…`, Production and Preview.
6. **Deployments → ⋯ on the latest → Redeploy**.

## 6. End-to-end test

1. In the booking engine the site is running on (Hostaway, or Beds24 after
   the switch), **block off a fake date range** (a month two years out). The
   first successful test booking creates a real reservation on your real
   calendar, and the engine pushes it to Airbnb and Booking.com.
2. Open `https://YOUR-VERCEL-URL/tourist`, pick those dates, **Book now**,
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

If anything fails, **Vercel → Logs → Functions** shows the server-side
log lines (`[booking/webhook] …`). Look soon after the failure; free-plan
logs are kept only briefly.

## 8. Going live

1. **Stripe:** toggle off Test mode → **Developers → API keys**: copy the
   **live** publishable and secret keys.
2. **Stripe (live mode):** **Webhooks → Add endpoint** with the same URL
   (now on your real domain) and the same `payment_intent.succeeded` event.
   Copy the live `whsec_…`.
3. **Vercel:** update the three Stripe variables to the live values.
4. **Deployments → ⋯ on the latest → Redeploy**.
5. Make one real low-value booking and refund it in Stripe to prove the live
   path works.

## Notes

- **Region:** `vercel.json` pins serverless functions to Sydney (`syd1`),
  the lowest latency for New Zealand visitors.
- **China access:** Vercel is blocked in mainland China. For visitors inside
  the firewall this URL will not load; a China-accessible host is a separate,
  later decision.
- **Auto-deploys:** every push to `main` deploys production; every pull
  request gets its own preview URL in the Vercel bot's comment.
- **Variable changes do not redeploy automatically.** After changing any
  variable, trigger a redeploy.
- **Logs:** **Vercel → Project → Logs** (or a deployment's **Functions**
  tab) shows the server-side lines (`[booking] backend: …`,
  `[standalone] …`, `[booking/inquiry] …`). They appear on the first page
  view after a deploy, not in the build log.
