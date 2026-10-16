#!/usr/bin/env node
/**
 * One-time Beds24 setup: exchange an invite code for a refresh token.
 *
 *   1. In Beds24: Settings -> Apps & Integrations -> API -> generate an invite
 *      code. Give it the scopes the website needs: read properties, read
 *      inventory (calendar and prices), read and write bookings. Leave
 *      "personal data" scopes on if you later want guest details.
 *   2. Run:   node scripts/beds24-setup.mjs <invite code>
 *      (or    BEDS24_INVITE_CODE=<code> node scripts/beds24-setup.mjs)
 *   3. Copy the printed refresh token into Netlify as BEDS24_REFRESH_TOKEN.
 *
 * The invite code works once. The refresh token is long-lived and is what
 * the website uses to mint 24-hour access tokens.
 */

const apiBase = (process.env.BEDS24_API_BASE || "https://beds24.com/api/v2").replace(/\/$/, "");
const code = (process.argv[2] || process.env.BEDS24_INVITE_CODE || "").trim();

if (!code) {
  console.error("Usage: node scripts/beds24-setup.mjs <invite code>");
  process.exit(1);
}

const setup = await fetch(`${apiBase}/authentication/setup`, {
  method: "GET",
  headers: { code, deviceName: "kiwi-cloud-homes website", accept: "application/json" },
});
const setupText = await setup.text();
if (!setup.ok) {
  console.error(`Beds24 rejected the invite code: ${setup.status} ${setup.statusText}\n${setupText}`);
  process.exit(1);
}
const { token, refreshToken, expiresIn } = JSON.parse(setupText);
if (!refreshToken) {
  console.error(`No refresh token in the response:\n${setupText}`);
  process.exit(1);
}

console.log("\nBeds24 refresh token (store this in Netlify as BEDS24_REFRESH_TOKEN):\n");
console.log(refreshToken);
console.log(`\nAn access token was also issued; it expires in ${expiresIn ?? "?"} seconds and is not needed.\n`);

if (token) {
  const details = await fetch(`${apiBase}/authentication/details`, {
    method: "GET",
    headers: { token, accept: "application/json" },
  });
  if (details.ok) {
    const d = await details.json();
    console.log("Token check:");
    console.log(`  valid:      ${d.validToken}`);
    console.log(`  scopes:     ${(d.token?.scopes ?? []).join(", ") || "(none reported)"}`);
    console.log(
      `  properties: ${d.token?.onlyPropertyId ? `only property ${d.token.onlyPropertyId}` : "all properties in the account"}`,
    );
    const scopes = (d.token?.scopes ?? []).join(" ").toLowerCase();
    const needed = ["bookings", "inventory", "properties"];
    const missing = needed.filter((s) => !scopes.includes(s));
    if (missing.length > 0) {
      console.log(
        `\nWarning: the scopes do not mention ${missing.join(", ")}. Generate a new invite code with those scopes if the website cannot read the calendar or create bookings.`,
      );
    }
  } else {
    console.log("Token check skipped (details endpoint returned", details.status, ")");
  }
}
