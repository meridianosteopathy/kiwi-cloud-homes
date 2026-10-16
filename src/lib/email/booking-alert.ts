/**
 * Owner alert — sent from the Stripe webhook when a payment has been captured
 * but no booking could be written to the booking engine (the nights were
 * taken in the meantime, the listing is unknown, the currency does not
 * match, or the PaymentIntent carries no booking details). A person has to
 * refund the guest or enter the booking by hand, so this goes to the owner's
 * inbox (INQUIRY_EMAIL, else EMAIL_REPLY_TO, else EMAIL_FROM_ADDRESS).
 *
 * Provider: Brevo, same single-POST transactional API as the confirmation.
 */

import type Stripe from "stripe";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export type BookingAlertInput = {
  /** Short machine reason, e.g. "unavailable", "unknown_listing", "missing_metadata". */
  reason: string;
  /** The error message the booking engine or webhook produced. */
  detail: string;
  paymentIntent: Stripe.PaymentIntent;
};

const ZERO_DECIMAL = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg",
  "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

function money(pi: Stripe.PaymentIntent): string {
  const currency = (pi.currency || "").toUpperCase();
  const minor = pi.amount_received || pi.amount || 0;
  const amount = ZERO_DECIMAL.has(currency.toLowerCase()) ? minor : minor / 100;
  return `${amount.toFixed(2)} ${currency}`.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function alertRecipient(): string | undefined {
  return (
    process.env.INQUIRY_EMAIL?.trim() ||
    process.env.EMAIL_REPLY_TO?.trim() ||
    process.env.EMAIL_FROM_ADDRESS?.trim() ||
    undefined
  );
}

export function renderAlert(input: BookingAlertInput): { subject: string; html: string; text: string } {
  const pi = input.paymentIntent;
  const meta = pi.metadata ?? {};
  const stripeUrl = `https://dashboard.stripe.com/${pi.livemode ? "" : "test/"}payments/${pi.id}`;
  const rows: Array<[string, string]> = [
    ["Reason", input.reason],
    ["Detail", input.detail],
    ["Payment", `${money(pi)} (${pi.id})`],
    ["Stripe", stripeUrl],
    ["Guest", [meta.guest_name, meta.guest_email].filter(Boolean).join(" · ") || "unknown"],
    ["Listing", meta.listing_id || "unknown"],
    ["Dates", meta.check_in && meta.check_out ? `${meta.check_in} → ${meta.check_out}` : "unknown"],
    ["Guests", meta.guests || "unknown"],
    ["Locale", meta.locale || "unknown"],
  ];
  const subject = `[Kiwi Cloud Homes] ACTION NEEDED: paid booking not created (${input.reason})`;
  const intro =
    "A guest's payment succeeded but the booking could not be written to the booking engine. " +
    "Nothing will retry this. Please either refund the payment in Stripe or create the booking by hand and tell the guest.";
  const text = [subject, "", intro, "", ...rows.map(([k, v]) => `${k}: ${v}`)].join("\n");
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1E4E79;">
<h2 style="color:#1E4E79;">Paid booking not created</h2>
<p>${escapeHtml(intro)}</p>
<table cellpadding="6" style="border-collapse:collapse;">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="font-weight:bold;vertical-align:top;border-bottom:1px solid #A9CFEA;">${escapeHtml(k)}</td><td style="border-bottom:1px solid #A9CFEA;">${
        k === "Stripe" ? `<a href="${escapeHtml(v)}">${escapeHtml(v)}</a>` : escapeHtml(v)
      }</td></tr>`,
  )
  .join("\n")}
</table>
<p style="color:#2C6E9E;font-size:13px;">Sent automatically by the Kiwi Cloud Homes website.</p>
</body></html>`;
  return { subject, html, text };
}

export async function sendBookingAlert(
  input: BookingAlertInput,
): Promise<{ id?: string; skipped?: string; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { skipped: "BREVO_API_KEY not configured" };
  const from = process.env.EMAIL_FROM_ADDRESS?.trim();
  if (!from) return { skipped: "EMAIL_FROM_ADDRESS not configured" };
  const to = alertRecipient();
  if (!to) return { skipped: "no owner address (INQUIRY_EMAIL) configured" };

  const { subject, html, text } = renderAlert(input);
  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: from, name: "Kiwi Cloud Homes" },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
        tags: ["booking-alert", `reason:${input.reason}`],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { error: `Brevo ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 300)}` : ""}` };
    }
    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { id: data.messageId ?? "sent" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
