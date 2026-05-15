/**
 * Detects whether the site is configured with Stripe TEST keys (pk_test_…) vs
 * LIVE keys (pk_live_…). Used to show/hide the test-mode banners on the
 * booking flow. When the host swaps to live keys in Vercel and redeploys,
 * banners disappear automatically — no code change needed.
 *
 * The publishable key is exposed to the client via NEXT_PUBLIC_, so this
 * works in both server and client components.
 */
export function isStripeTestMode(): boolean {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  // Treat "no key configured" as test mode too, so the warning still shows
  // on a half-set-up deployment instead of silently disappearing.
  if (!key) return true;
  return key.startsWith("pk_test_");
}
