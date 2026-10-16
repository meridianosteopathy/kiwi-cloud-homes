#!/usr/bin/env node
/**
 * One-time Beds24 setup: exchange an invite code for a refresh token.
 *
 *   1. In Beds24: Settings -> Marketplace -> API (the page at
 *      https://beds24.com/control3.php?pagetype=apiv2). Generate an INVITE
 *      CODE (not a long-life token; those are read-only and cannot create
 *      bookings). Scopes are fixed when the code is created; the website needs:
 *        read:properties, read:inventory, all:bookings,
 *        all:bookings-personal (guest names), all:bookings-financial (prices).
 *      The code is single-use and expires after 24 hours, so exchange it now.
 *   2. Run:   npm run beds24:setup -- <invite code>
 *      (or    BEDS24_INVITE_CODE=<code> node scripts/beds24-setup.mjs)
 *   3. Copy the printed refresh token into Netlify as BEDS24_REFRESH_TOKEN.
 *
 * The refresh token is long-lived (it stays valid while used at least every
 * 30 days) and is what the website uses to mint 24-hour access tokens.
 */

const apiBase = (process.env.BEDS24_API_BASE || "https://api.beds24.com/v2").replace(/\/$/, "");
const code = (process.argv[2] || process.env.BEDS24_INVITE_CODE || "").trim();

if (!code) {
  console.error("Usage: npm run beds24:setup -- <invite code>");
  process.exit(1);
}

const setup = await fetch(`${apiBase}/authentication/setup`, {
  method: "GET",
  headers: { code, deviceName: "kiwi-cloud-homes-web", accept: "application/json" },
});
const setupText = await setup.text();
if (!setup.ok) {
  console.error(`Beds24 rejected the invite code: ${setup.status} ${setup.statusText}\n${setupText}`);
  console.error("Invite codes are single-use and expire after 24 hours. Generate a new one and try again.");
  process.exit(1);
}
const { token, refreshToken, expiresIn } = JSON.parse(setupText);
if (!refreshToken) {
  console.error(`No refresh token in the response:\n${setupText}`);
  process.exit(1);
}

console.log("\nBeds24 refresh token (store this in Netlify as BEDS24_REFRESH_TOKEN, never in the repo):\n");
console.log(refreshToken);
console.log(`\nAn access token was also issued (expires in ${expiresIn ?? "?"} seconds); it is not needed.\n`);

if (token) {
  const details = await fetch(`${apiBase}/authentication/details`, {
    method: "GET",
    headers: { token, accept: "application/json" },
  });
  if (details.ok) {
    const d = await details.json();
    const scopes = Array.isArray(d.token?.scopes) ? d.token.scopes : [];
    console.log("Token check:");
    console.log(`  valid:      ${d.validToken}`);
    console.log(`  scopes:     ${scopes.join(", ") || "(none reported)"}`);
    console.log(
      `  properties: ${d.token?.onlyPropertyId ? `only property ${d.token.onlyPropertyId}` : "all properties in the account"}`,
    );
    const has = (pattern) => scopes.some((s) => pattern.test(String(s)));
    const problems = [];
    if (!has(/properties/i)) problems.push("read:properties (needed to list the houses)");
    if (!has(/inventory/i)) problems.push("read:inventory (needed for prices and availability)");
    if (!has(/^(all|write):bookings$/i)) problems.push("all:bookings (needed to create bookings)");
    if (!has(/bookings-personal/i)) problems.push("all:bookings-personal (needed to store guest names and emails)");
    if (!has(/bookings-financial/i)) problems.push("all:bookings-financial (needed to store the price and payment)");
    if (problems.length > 0) {
      console.log("\nWarning: this token is missing scopes the website needs:");
      for (const p of problems) console.log(`  - ${p}`);
      console.log("Generate a new invite code with those scopes ticked and run this again.");
    } else {
      console.log("\nAll required scopes are present.");
    }
  } else {
    console.log("Token check skipped (details endpoint returned", details.status, ")");
  }
}
