/**
 * Booking confirmation email — sent from the Stripe webhook after the
 * Hostaway reservation is created successfully. Bilingual; the visitor's
 * locale at checkout time decides the language.
 *
 * Email HTML follows email-safe conventions: <table> layout, inline styles,
 * common fonts. Renders cleanly in Gmail, Apple Mail, Outlook, QQ Mail.
 *
 * Provider: Brevo (formerly Sendinblue). Their transactional API is a single
 * POST; we hit it via fetch so there's no SDK dependency to track.
 */

import type { HostawayListing } from "@/lib/hostaway";

export type ConfirmationInput = {
  guestName: string;
  guestEmail: string;
  locale: "zh-CN" | "en";
  listing: HostawayListing;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  nights: number;
  guests: number;
  /** Total paid, major units (e.g. 1380.00). */
  total: number;
  currency: string;
  reservationId: string;
  paymentIntentId: string;
};

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

const COPY: Record<
  "zh-CN" | "en",
  {
    subject: (listing: string) => string;
    greeting: (name: string) => string;
    confirmed: string;
    stayDetails: string;
    checkIn: string;
    checkOut: string;
    nights: (n: number) => string;
    guestsLabel: (n: number) => string;
    propertyHeading: string;
    address: string;
    paymentHeading: string;
    paidLabel: string;
    referenceLabel: string;
    hostContact: string;
    hostContactBody: string;
    footer: string;
  }
> = {
  "zh-CN": {
    subject: (listing) => `[Kiwi Cloud Homes] 您的预订已确认 — ${listing}`,
    greeting: (name) => `${name},您好,`,
    confirmed: "您的预订已确认。期待在新西兰与您相见!",
    stayDetails: "入住信息",
    checkIn: "入住",
    checkOut: "退房",
    nights: (n) => `${n} 晚`,
    guestsLabel: (n) => `${n} 位入住`,
    propertyHeading: "房源",
    address: "地址",
    paymentHeading: "付款",
    paidLabel: "已支付",
    referenceLabel: "预订编号",
    hostContact: "联系房东",
    hostContactBody:
      "任何关于入住、钥匙、附近交通或推荐的问题,直接回复此邮件,房东会尽快回复您。",
    footer: "本邮件由 Kiwi Cloud Homes 自动发送 · kiwicloudhomes.co.nz",
  },
  en: {
    subject: (listing) => `[Kiwi Cloud Homes] Your booking is confirmed — ${listing}`,
    greeting: (name) => `Hi ${name},`,
    confirmed: "Your booking is confirmed. We can't wait to welcome you to New Zealand!",
    stayDetails: "Your stay",
    checkIn: "Check-in",
    checkOut: "Check-out",
    nights: (n) => `${n} night${n === 1 ? "" : "s"}`,
    guestsLabel: (n) => `${n} guest${n === 1 ? "" : "s"}`,
    propertyHeading: "Property",
    address: "Address",
    paymentHeading: "Payment",
    paidLabel: "Total paid",
    referenceLabel: "Booking reference",
    hostContact: "Contact the host",
    hostContactBody:
      "For anything about check-in, keys, local transport, or recommendations, just reply to this email — the host will get back to you soon.",
    footer: "Sent automatically by Kiwi Cloud Homes · kiwicloudhomes.co.nz",
  },
};

function formatDate(iso: string, locale: "zh-CN" | "en"): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(
    locale === "zh-CN" ? "zh-CN" : "en-NZ",
    { weekday: "short", year: "numeric", month: "short", day: "numeric" },
  );
}

function formatMoney(amount: number, currency: string, locale: "zh-CN" | "en"): string {
  return new Intl.NumberFormat(locale === "zh-CN" ? "zh-CN" : "en-NZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function renderHtml(input: ConfirmationInput): string {
  const c = COPY[input.locale];
  const heroImage = input.listing.images[0]?.url ?? "";
  const addressLine = [
    input.listing.address.line1,
    input.listing.address.city,
    input.listing.address.region,
    input.listing.address.country,
  ]
    .filter((s) => s && s !== "—")
    .join(", ");

  // Brand kiwi green: #306330. Backgrounds: #f8faf8 page, white card.
  return `<!DOCTYPE html>
<html lang="${input.locale}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(c.subject(input.listing.name))}</title>
</head>
<body style="margin:0;padding:0;background:#f8faf8;font-family:system-ui,-apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',Arial,sans-serif;color:#1f3e1f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8faf8;padding:24px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #dcecdc;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="padding:24px 28px 8px;border-bottom:1px solid #f1f7f1;">
            <div style="font-size:14px;font-weight:600;color:#306330;letter-spacing:1px;">KIWI CLOUD HOMES</div>
            <div style="margin-top:4px;font-size:11px;color:#629d62;">${input.locale === "zh-CN" ? "新西兰短租 · 您的云端之家" : "Short-stay homes in New Zealand"}</div>
          </td>
        </tr>
        ${heroImage ? `
        <tr>
          <td>
            <img src="${escapeAttr(heroImage)}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;" />
          </td>
        </tr>` : ""}
        <tr>
          <td style="padding:24px 28px 0;">
            <p style="margin:0 0 8px;font-size:15px;color:#1a331a;">${escapeHtml(c.greeting(input.guestName))}</p>
            <p style="margin:0 0 16px;font-size:18px;font-weight:600;color:#1a331a;line-height:1.4;">${escapeHtml(c.confirmed)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 4px;">
            <div style="font-size:11px;font-weight:700;color:#306330;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(c.stayDetails)}</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;border:1px solid #f1f7f1;border-radius:8px;">
              <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f7f1;width:35%;font-size:13px;color:#629d62;">${escapeHtml(c.checkIn)}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f7f1;font-size:14px;color:#1a331a;font-weight:500;">${escapeHtml(formatDate(input.checkIn, input.locale))}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f7f1;font-size:13px;color:#629d62;">${escapeHtml(c.checkOut)}</td>
                <td style="padding:10px 12px;border-bottom:1px solid #f1f7f1;font-size:14px;color:#1a331a;font-weight:500;">${escapeHtml(formatDate(input.checkOut, input.locale))}</td>
              </tr>
              <tr>
                <td style="padding:10px 12px;font-size:13px;color:#629d62;">${escapeHtml(input.locale === "zh-CN" ? "时长 / 人数" : "Length / guests")}</td>
                <td style="padding:10px 12px;font-size:14px;color:#1a331a;font-weight:500;">${escapeHtml(c.nights(input.nights))} · ${escapeHtml(c.guestsLabel(input.guests))}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 4px;">
            <div style="font-size:11px;font-weight:700;color:#306330;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(c.propertyHeading)}</div>
            <div style="margin-top:6px;font-size:15px;font-weight:600;color:#1a331a;">${escapeHtml(input.listing.name)}</div>
            ${addressLine ? `<div style="margin-top:2px;font-size:13px;color:#264d26;">${escapeHtml(c.address)}: ${escapeHtml(addressLine)}</div>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 4px;">
            <div style="font-size:11px;font-weight:700;color:#306330;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(c.paymentHeading)}</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;">
              <tr>
                <td style="font-size:13px;color:#629d62;">${escapeHtml(c.paidLabel)}</td>
                <td style="font-size:16px;font-weight:600;color:#1a331a;text-align:right;">${escapeHtml(formatMoney(input.total, input.currency, input.locale))}</td>
              </tr>
              <tr>
                <td style="padding-top:4px;font-size:13px;color:#629d62;">${escapeHtml(c.referenceLabel)}</td>
                <td style="padding-top:4px;font-size:12px;color:#264d26;text-align:right;font-family:ui-monospace,Menlo,monospace;">${escapeHtml(input.reservationId)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 8px;">
            <div style="font-size:11px;font-weight:700;color:#306330;text-transform:uppercase;letter-spacing:1px;">${escapeHtml(c.hostContact)}</div>
            <p style="margin:6px 0 0;font-size:13px;line-height:1.5;color:#264d26;">${escapeHtml(c.hostContactBody)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px;border-top:1px solid #f1f7f1;font-size:11px;color:#8ebd8e;">
            ${escapeHtml(c.footer)}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

export async function sendBookingConfirmation(
  input: ConfirmationInput,
): Promise<{ id?: string; skipped?: string; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { skipped: "BREVO_API_KEY not configured" };
  }

  const from = process.env.EMAIL_FROM_ADDRESS;
  if (!from) {
    return { skipped: "EMAIL_FROM_ADDRESS not configured" };
  }

  const replyTo = process.env.EMAIL_REPLY_TO || from;

  const c = COPY[input.locale];
  const html = renderHtml(input);
  const senderName =
    input.locale === "zh-CN" ? "Kiwi Cloud Homes 云端之家" : "Kiwi Cloud Homes";

  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: from, name: senderName },
        to: [{ email: input.guestEmail, name: input.guestName || undefined }],
        replyTo: { email: replyTo },
        subject: c.subject(input.listing.name),
        htmlContent: html,
        tags: ["booking-confirmation", `locale:${input.locale}`],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        error: `Brevo ${res.status} ${res.statusText}${body ? ` — ${body.slice(0, 300)}` : ""}`,
      };
    }
    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { id: data.messageId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
