/**
 * Inquiry emails — a guest's message from the website, delivered to the
 * owner's inbox with the guest as reply-to, plus a short fixed-text
 * acknowledgement to the guest in their language. The guest never receives
 * the free-form message back: the form is public, so echoing arbitrary text
 * to an arbitrary address would turn the site into a mail relay. Replaces
 * the mailto link when Brevo is configured; the dialog falls back to mailto
 * when it is not.
 */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export type InquiryEmailInput = {
  listingId: string;
  listingName: string;
  name: string;
  email: string;
  phone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  message?: string;
  locale: "en" | "zh-CN";
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderInquiry(input: InquiryEmailInput): { subject: string; html: string; text: string } {
  const subject = `[Kiwi Cloud Homes] Inquiry: ${input.listingName} · ${input.checkIn} → ${input.checkOut} · ${input.guests} guest${input.guests === 1 ? "" : "s"}`;
  const rows: Array<[string, string]> = [
    ["Home", `${input.listingName} (${input.listingId})`],
    ["Guest", input.name],
    ["Email", input.email],
    ["Phone", input.phone?.trim() || "—"],
    ["Check-in", input.checkIn],
    ["Check-out", input.checkOut],
    ["Guests", String(input.guests)],
    ["Language", input.locale],
  ];
  const message = input.message?.trim() || "—";
  const text = [
    subject,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    "Message:",
    message,
    "",
    "Reply to this email to answer the guest.",
  ].join("\n");
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1E4E79;">
<h2 style="color:#1E4E79;">New inquiry from the website</h2>
<table cellpadding="6" style="border-collapse:collapse;">
${rows
  .map(
    ([k, v]) =>
      `<tr><td style="font-weight:bold;vertical-align:top;border-bottom:1px solid #A9CFEA;">${escapeHtml(k)}</td><td style="border-bottom:1px solid #A9CFEA;">${escapeHtml(v)}</td></tr>`,
  )
  .join("\n")}
</table>
<h3 style="color:#2C6E9E;">Message</h3>
<p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
<p style="color:#2C6E9E;font-size:13px;">Reply to this email to answer the guest. Sent by the Kiwi Cloud Homes website.</p>
</body></html>`;
  return { subject, html, text };
}

const ACK_COPY = {
  en: {
    subject: (listing: string) => `[Kiwi Cloud Homes] We received your message about ${listing}`,
    body: (i: InquiryEmailInput) =>
      `Hi ${i.name},\n\nThank you for your message about ${i.listingName} for ${i.checkIn} to ${i.checkOut} (${i.guests} guest${i.guests === 1 ? "" : "s"}).\n\nThe host will reply to this address soon. If you want to add anything, just reply to this email.\n\nKiwi Cloud Homes`,
  },
  "zh-CN": {
    subject: (listing: string) => `[Kiwi Cloud Homes] 我们已收到您关于 ${listing} 的咨询`,
    body: (i: InquiryEmailInput) =>
      `${i.name},您好!\n\n我们已收到您关于 ${i.listingName} 的咨询(${i.checkIn} 至 ${i.checkOut},${i.guests} 位客人)。\n\n房东会尽快回复到此邮箱。如需补充信息,直接回复本邮件即可。\n\nKiwi Cloud Homes 云端之家`,
  },
} as const;

/** The guest's acknowledgement: fixed wording in their language, no free-form text echoed. */
export function renderAcknowledgement(input: InquiryEmailInput): { subject: string; html: string; text: string } {
  const copy = ACK_COPY[input.locale] ?? ACK_COPY.en;
  const text = copy.body(input);
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1E4E79;"><p style="white-space:pre-wrap;">${escapeHtml(text)}</p></body></html>`;
  return { subject: copy.subject(input.listingName), html, text };
}

type SendResult = { id?: string; skipped?: string; error?: string };

async function brevoSend(apiKey: string, payload: Record<string, unknown>): Promise<SendResult> {
  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
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

/**
 * Delivers the inquiry to the owner; on success also sends the guest a short
 * acknowledgement (its failure is logged, not returned: the inquiry itself
 * got through).
 */
export async function sendInquiryEmail(input: InquiryEmailInput): Promise<SendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { skipped: "BREVO_API_KEY not configured" };
  const from = process.env.EMAIL_FROM_ADDRESS?.trim();
  if (!from) return { skipped: "EMAIL_FROM_ADDRESS not configured" };
  const to = process.env.INQUIRY_EMAIL?.trim();
  if (!to) return { skipped: "INQUIRY_EMAIL not configured" };

  const owner = renderInquiry(input);
  const sent = await brevoSend(apiKey, {
    sender: { email: from, name: "Kiwi Cloud Homes" },
    to: [{ email: to }],
    replyTo: { email: input.email, name: input.name },
    subject: owner.subject,
    htmlContent: owner.html,
    textContent: owner.text,
    tags: ["inquiry", `locale:${input.locale}`],
  });
  if (!sent.id) return sent;

  const ack = renderAcknowledgement(input);
  const copy = await brevoSend(apiKey, {
    sender: { email: from, name: input.locale === "zh-CN" ? "Kiwi Cloud Homes 云端之家" : "Kiwi Cloud Homes" },
    to: [{ email: input.email, name: input.name }],
    replyTo: { email: process.env.EMAIL_REPLY_TO?.trim() || to },
    subject: ack.subject,
    htmlContent: ack.html,
    textContent: ack.text,
    tags: ["inquiry-ack", `locale:${input.locale}`],
  });
  if (!copy.id) {
    console.warn(`[inquiry] acknowledgement to the guest not sent: ${copy.error ?? copy.skipped}`);
  }
  return sent;
}
