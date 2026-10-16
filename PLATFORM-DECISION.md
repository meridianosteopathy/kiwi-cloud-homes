# Replacing Hostaway: decision brief

Prepared 15 October 2026 for Kiwi Cloud Homes. One property, listed on Airbnb and
Booking.com, plus the direct-booking website in this repository.

## 1. The short answer

Going back to Hostaway is the easiest choice, not the cheaper one. For one listing it
costs roughly three to five times more than the alternatives. It is sold by sales call
only, and it may not accept a single-listing account at all.

Building your own channel manager from scratch is not possible right now. Airbnb and
Booking.com are not giving API access to new software. Any platform you own has to run
on someone else's approved connection.

So the recommended path is a hybrid:

1. Use a cheap small-host channel manager that includes an open API as the engine.
2. Point the website at that engine instead of Hostaway (one file changes).
3. If you still want your own screens, build your calendar, inbox and reservation views
   on top of the engine in small iterations. You own the user interface and the data.
   The engine can be swapped later.

Engine cost: about NZD 33 to 50 a month, versus NZD 170 to 300 for Hostaway.

First choice for the engine: **Beds24**. Runner-up: **Hospitable**. Both connect to
Airbnb and Booking.com through official connections. Both let you read and reply to guest
messages from both platforms in one inbox. Section 6 explains the choice.

One thing is urgent whichever way you go. The website reads availability and prices from
Hostaway and writes every paid booking into Hostaway. When the employer's Hostaway account
stops, the website stops taking bookings. Export your reservation history from Hostaway
this week, and treat Phase 1 (section 7) as the first job.

## 2. How much to trust the numbers

The research ran from a locked-down environment that could not open any vendor's own
pricing page. Every price here comes from help-centre articles, search summaries and
third-party reviews dated July to October 2026. A second, independent check of each price
was attempted and could not run for the same reason. The overall ranking is safe. The
exact figures are not, so confirm them on the vendor pages (section 8) before paying
anyone.

Exchange rates used: USD 1 = NZD 1.72 and EUR 1 = NZD 2.00 (mid-2026 market rates,
rounded). All prices exclude GST. Overseas vendors registered for NZ GST add 15 percent
unless you give them a GST number. If you are not GST-registered, add 15 percent to every
software and hosting line.

## 3. What changed since you first asked

**The two front doors are shut.** Channel managers talk to Airbnb and Booking.com through
partner APIs. Airbnb has never had a public API, and in 2026 it only approves established
software companies with many listings. Booking.com's connectivity portal carries a notice
that it is pausing new connectivity providers until further notice. A one-property owner,
or a new piece of software, cannot get either connection today.

**Automating the dashboards is not a workaround.** Software that logs in as you and reads
the Airbnb or Booking.com host pages breaks both platforms' terms. The penalty is account
suspension. Booking.com's two-factor login also makes it impractical.

**"Connectivity as a service" is priced for software companies.** Channex, the most
transparent of them, charges a USD 130 (NZD 224) monthly platform fee plus USD 0.50 per
unit. Rentals United starts at USD 330 (NZD 568). NextPax targets portfolios of 50 or
more. None is sensible for one property.

**So "my own platform" means one of two things.** Either your own screens and database on
top of a small-host channel manager that exposes its data through an API. Or your own
screens on the free plumbing every host already has: iCal calendar feeds and the
notification emails both platforms send. The first is how custom dashboards get built on
Hostaway today. The second works but has real gaps, described in option D.

**Your hosting plan matters too.** Vercel's free Hobby plan is for non-commercial use
only, and Vercel lists "requesting or processing payment from visitors" as commercial use.
A site that takes card payments is not allowed on it. The fix is to move the website to
Netlify's free plan, which permits commercial projects, needs no card and does not put the
site to sleep. The catch is a monthly allowance of 300 credits: each production deploy
costs 15 and traffic uses the rest, which is enough for one property if deploys are kept to
a handful a month. Hosting is therefore NZD 0 in the tables below. If the allowance ever
runs short, Netlify's Personal plan is USD 9 (NZD 15) a month. DEPLOY.md has the steps.

## 4. The four options

Effort sizes: S = a few hours of your own time. M = a few days of developer work.
L = several weeks of developer work plus ongoing upkeep.

### A. Re-subscribe to Hostaway, or take over the employer's account

- **Price:** not published. Third-party estimates for one to four listings are USD 100 to
  175 a month (NZD 172 to 301). Hostaway's own comparison page mentions a USD 500
  (NZD 860) onboarding fee. Twelve-month contracts are the norm according to independent
  reviews. No free trial.
- **Small-host fit:** Hostaway's quote form starts at two listings, with a separate link
  for single-listing hosts. One 2026 review says single-listing hosts are waitlisted.
  Hostaway's billing rules charge for every listing in the account and allow no pause.
- **Takeover:** there is no documented transfer feature. The employer's admin email asks
  Hostaway support to change the login to yours, then you change the card and billing
  details. Whether Hostaway re-prices or charges onboarding on a takeover is unknown.
- **Website:** unchanged, as long as API access stays included in your plan. No official
  page confirms the API is on every plan.
- **You get:** all four features, mature, today.
- **Effort:** S. **Lock-in:** 12-month term likely. Reservation data is deleted on
  deactivation, so export first.

### B. Switch to a small-host channel manager

Two to trial, side by side, in the same fortnight.

**Beds24 (first choice).** About EUR 16.60 a month (NZD 33): a EUR 15.50 base plus
EUR 0.55 per channel link. Pay as you go, no contract, no setup fee, accepts payment in
NZD. The API is included on every account and covers bookings (including creating one),
availability and prices, and reading and sending Airbnb and Booking.com messages. Strong
reporting. Native smart-lock integrations (RemoteLock, Nuki). Weakness: reviewers call the
interface dated and complex. 14-day trial.

**Hospitable (runner-up).** Essentials is free and already gives you the unified inbox
and calendar for Airbnb and Booking.com, but no API. The Host plan at USD 29 (NZD 50)
unlocks the API for one property. Friendlier interface by reputation. Weaknesses: smart
locks need the USD 59 (NZD 101) Professional plan, and it is unclear whether a personal
API token can create a reservation or send a message. Test both in the trial. 14-day
trial, no card needed.

**Set aside, with reasons.**

- Smoobu (EUR 35, NZD 70): good product, twice Beds24's price, API keys not available on
  the trial.
- OwnerRez (USD 40, NZD 69): well documented, free API token, but US-centric and twice
  the price.
- Lodgify (USD 14 to 18 for one property): the API is gated to the USD 42 to 53
  Professional plan.
- Hostex (USD 4.90, NZD 8): tempting, but prices are single-source and the API needs the
  Pro plan. A sandbox, not a decision.
- Hostfully (about USD 114 with its platform fee), Uplisting (GBP 72, API invite-only
  and without messaging), iGMS (USD 48, no public API), Guesty Lite (API probably
  Pro-only), Tokeet (Booking.com messages arrive by email relay).

Shared points for option B:

- **Website:** rewrite the one Hostaway adapter file against the new vendor's API. Three
  data calls plus a login call. The mock client and environment flag already exist, so
  the swap is contained.
- **You get:** calendar, inbox, reservation details and channel mapping in the vendor's
  app from day one.
- **Effort:** S for you, M for the website swap. **Lock-in:** monthly, data exportable
  through the API.

### C. Your own platform on top of the channel manager's API

Option B plus your own screens, built in phases. The vendor keeps the Airbnb and
Booking.com pipes and the channel mapping. Your app holds a copy of the data, shows one
calendar, one inbox and one reservation list, and the website becomes part of the same
app.

- **Monthly:** the same NZD 33 to 50 engine, plus hosting at NZD 0 on Netlify's free plan
  (section 3), plus a free Neon Postgres database. Neon rather
  than Supabase, because Supabase's free tier pauses a project after a quiet week.
- **Effort:** L in total, split into M-sized phases. Phase 1 is identical to option B's
  website swap.
- **Lock-in:** low. The vendor sits behind one adapter file.
- **Risk:** you own software maintenance, and you may build screens the vendor app
  already gives you.

### D. Your own platform on zero-cost plumbing (iCal plus email)

- **Monthly:** software NZD 0; hosting NZD 0 on Netlify's free plan.
- **Calendar:** merge Airbnb's and Booking.com's iCal feeds with direct bookings and
  publish one feed each platform imports. Airbnb refreshes imported feeds every 3 hours.
  Booking.com publishes no figure; reports say 1 to 6 hours. Typical lag is 1 to 3 hours
  each way, worst case 5 to 8. That lag is where double bookings come from. Feeds carry
  dates only: no prices, no minimum stay, no guest details. Booking.com's feed does not
  even distinguish a booking from a manual block.
- **Inbox:** parse notification emails. Airbnb's confirmation email gives guest first
  name, dates, confirmation code and payout. Whether a reply to Airbnb's rotating reply
  address still reaches the guest is unconfirmed, so replying usually means opening the
  Airbnb app. Booking.com guest messages arrive from a per-booking relay address with a
  "write your reply above this line" marker, which suggests reply-by-email works, but it
  was not verified.
- **Channel management:** none. You paste iCal links into each platform, and failures are
  silent.
- **Website:** must hold its own prices and minimum stay, maintained by hand alongside
  Airbnb and Booking.com.
- **Effort:** L, plus ongoing fixes when email templates change. **Lock-in:** none.

## 5. Twelve-month cost comparison

Hosting is counted the same way in every row: NZD 0 on Netlify's free plan, within its
monthly allowance (section 3). If the site ever needs Netlify's Personal plan, add NZD 15 a
month (NZD 180 a year) to every row.

| Option | Software per month, NZD (original) | Hosting per month, NZD | One-off | 12-month total, NZD |
|---|---|---|---|---|
| A. Hostaway | 172 to 301 (USD 100 to 175), quote only | 0 | 0 to 860 onboarding (USD 0 to 500) | 2,060 to 4,470 |
| B. Beds24 | 33 (EUR 16.60) | 0 | none | about 400 |
| B. Hospitable Host | 50 (USD 29) | 0 | none | about 600 |
| C. Own screens on Beds24 | 33 | 0 | your build time | about 400 |
| D. iCal plus email | 0 | 0 | your build time | 0, your build time only |

Add 15 percent to every line if you are not GST-registered. Hospitable and most others
bill in USD or EUR, so expect a card foreign-currency fee of 2 to 3 percent on top.
Beds24 accepts NZD.

## 6. Feature comparison

| Need | A. Hostaway | B. Beds24 or Hospitable | C. Own screens on vendor API | D. iCal plus email |
|---|---|---|---|---|
| One calendar | Yes | Yes, in vendor app | Yes, your screen | Yes, 1 to 8 hours behind, dates only |
| Read guest messages, both platforms | Yes | Yes | Yes via Beds24 API; Hospitable likely | From parsed emails; fragile |
| Reply to Airbnb guests | Yes | Yes | Yes via Beds24 API; Hospitable unconfirmed | Opens the Airbnb app |
| Reply to Booking.com guests | Yes, within Booking.com rules | Yes, same rules | Yes via Beds24 API | Probably by email reply; unverified |
| Reservation details | Full | Full | Full, mirrored into your database | Partial, from emails |
| Channel management | Yes | Yes, in vendor app | Mapping in vendor app, status in yours | None, manual iCal links |
| Direct-booking website | Works unchanged | One adapter file | Same app, same database | Prices and min-stay kept by hand |
| Financial reporting (later) | Built in | Beds24 strong; Hospitable needs its top plan for accounting | Build from your own data | From platform CSV exports |
| Smart locks (later) | Several brands | Beds24: RemoteLock, Nuki; Hospitable: Professional plan | Seam, or Nuki and TTLock APIs | Build yourself |
| Who holds your data | Hostaway; deleted on deactivation | Vendor; exportable via API | You, plus the vendor | You, but only what emails carry |

## 7. Recommendation, and what would change it

Go with option B now, on Beds24, and let it grow into option C only as far as you find
useful.

Why Beds24 first: it meets all four day-one wants for about NZD 33 a month with no
contract. The website change is the smallest possible, and the API covers what the site
needs. It accepts NZD, so no card foreign-currency fee. Its messaging API covers both
platforms, so the inbox you asked for can be built on it later. Reporting and smart locks
come without a plan upgrade.

Why Hospitable is close: a friendlier app, a genuinely free tier, and only about NZD 200 a
year more for the API plan. If Beds24 feels unusable in the trial, pick Hospitable. The
website work is the same size either way.

What would change my mind:

- Hostaway quotes you NZD 100 a month or less in writing, including API access, no
  onboarding fee, month to month, and accepts a single-listing takeover. Then Hostaway is
  a reasonable one-year bridge.
- Beds24's calculator shows a much higher price, or excludes the API at your tier. Then
  Hospitable Host.
- You can live with several-hour sync delays and replying to Airbnb guests in the Airbnb
  app. Then option D saves about NZD 400 to 600 a year. I would not take that trade for a
  business that takes payments.

## 8. Suggested iterations

| Phase | Size | You do | Gets built | Done when |
|---|---|---|---|---|
| 1. Take Hostaway out from under the website | M | Export data; open Beds24 and Hospitable trials; enter listing, prices, min stay; protect the cutover; reconnect channels | Beds24 adapter for the website; one test booking | Website takes bookings whether or not Hostaway exists |
| 2. Live on the channel manager | S | Use the vendor app daily for 2 to 4 weeks; fix the Vercel plan; cancel Hostaway | Nothing, or a webhook that sends your Brevo confirmation email for channel bookings | Off Hostaway, no double bookings |
| 3. Your own dashboard, version 1 (optional) | M | Decide whether the vendor app is enough; list the three things you want on one screen | One page: merged calendar and upcoming reservations, kept current by webhooks; Neon database | You open your page instead of the vendor's |
| 4. Inbox in your own app (optional) | M | Write down your message rules | Read and reply through the Beds24 messages API | Replies work on both platforms |
| 5. Reporting and smart locks | S to M | Pick a lock sold in NZ; choose Xero or a spreadsheet | Vendor integrations, or a monthly export routine | Monthly numbers reconcile to bank deposits |

Phase 1 cutover, step by step:

1. Export all reservation data from Hostaway.
2. Open a Beds24 trial and a Hospitable trial.
3. Enter listing content, nightly prices and minimum stay in Beds24. Create an API token
   (Settings > Marketplace > API).
4. Before disconnecting anything, block the next few weeks on Airbnb and Booking.com, or
   switch Airbnb to request-to-book. Disconnecting stops sync while the listing stays
   bookable.
5. In Hostaway, unmap the listing from Airbnb and Booking.com. On Airbnb, remove Hostaway
   from connected services under Account > Privacy and sharing, then connect Airbnb inside
   Beds24.
6. In the Booking.com Extranet, disconnect Hostaway as connectivity provider, then connect
   Beds24. Only one provider per listing is allowed.
7. Reopen the blocked dates once Beds24 shows both channels syncing and a test booking has
   blocked correctly on both.

Built alongside: a Beds24 adapter file implementing login plus the three data calls behind
the existing environment flag, and a Stripe test-mode booking proving the dates block on
both platforms.

## 9. Before you decide

Hostaway and the employer:

- Ask Hostaway sales for a written quote for a one-listing NZ account: monthly price,
  minimum, onboarding fee, term, currency, whether the API is included.
- Ask the employer for the Hostaway order form (term, auto-renewal, notice period). If
  you want the takeover, their admin must email Hostaway support now.
- Export reservation data this week.

Your accounts:

- Move the website to Netlify's free plan, following DEPLOY.md. Vercel's Hobby plan does
  not permit a site that takes payments.
- Confirm whether you are GST-registered and, if so, enter the GST number in each
  vendor's billing settings.

Beds24 and Hospitable:

- Run Beds24's pricing calculator for one property with two channel links. Confirm NZD
  billing, API included, and that the API exposes minimum stay.
- In the Hospitable trial, test whether a personal access token can create a reservation
  and send a guest message.
- Make one test booking in each trial and time how long dates take to block on Airbnb and
  Booking.com.

## 10. Sources

Prices and terms (none read live; see section 2):

- Hostaway pricing form: https://www.hostaway.com/pricing
- Hostaway comparison page (USD 500 onboarding): https://www.hostaway.com/compare/hostaway-vs-guesty
- Hostaway billing FAQ: https://support.hostaway.com/hc/en-us/articles/360047874254-Account-and-Billing-Common-Questions
- Hostaway cancellation policy: https://support.hostaway.com/hc/en-us/articles/14006214140699
- Hostaway third-party estimates: https://www.roommaster.com/blog/hostaway-pricing and https://strspecialist.com/reviews/hostaway-pms-review-airbnb
- Beds24 pricing: https://beds24.com/pricing.html
- Beds24 API on every account: https://wiki.beds24.com/index.php/Guest_Services:_How_to_connect_to_Beds24_using_API_V2
- Beds24 messages: https://wiki.beds24.com/index.php/Messages
- Hospitable pricing: https://help.hospitable.com/en/articles/4596748-hospitable-pricing-subscription-costs
- Hospitable API token: https://help.hospitable.com/en/articles/8609392-accessing-the-public-api-with-a-personal-access-token-pat
- Smoobu pricing: https://support.smoobu.com/hc/en-us/articles/360003170680-How-much-does-Smoobu-cost-Plans-and-pricing-explained
- OwnerRez costs: https://www.ownerrez.com/support/articles/costs-and-fees
- Lodgify pricing: https://www.lodgify.com/pricing/
- Hostex pricing: https://hostex.io/pricing/
- Channex pricing: https://channex.io/pricing
- Rentals United pricing: https://rentalsunited.com/pricing/

Platform programmes and sync:

- Airbnb partner programme: https://www.airbnb.com/partner
- Airbnb calendar sync help (every 3 hours): https://www.airbnb.com/help/article/99
- Booking.com connectivity portal (pause notice): https://connect.booking.com/
- Booking.com messaging API rules: https://developers.booking.com/connectivity/docs/messaging-api/managing-conversations/

Hosting and database:

- Vercel fair use (Hobby is non-commercial): https://vercel.com/docs/limits/fair-use-guidelines
- Vercel Pro plan: https://vercel.com/docs/plans/pro-plan
- Netlify free plan permits commercial projects: https://www.netlify.com/blog/introducing-netlify-free-plan/
- Netlify credits: https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/
- Netlify Next.js 16 support: https://www.netlify.com/changelog/next-js-16-deploy-on-netlify/
- Cloudflare Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Neon plans: https://neon.com/docs/introduction/plans
- Supabase free-tier pausing: https://supabase.com/docs/guides/platform/free-project-pausing

NZ tax and exchange rates:

- IRD, GST for overseas businesses: https://www.ird.govt.nz/gst/gst-for-overseas-businesses
- RBNZ B1 exchange rates: https://www.rbnz.govt.nz/statistics/series/exchange-and-interest-rates/b1
