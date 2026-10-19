/**
 * Inquiry email — a guest's message from the website, delivered to the
 * owner's inbox with the guest as reply-to, and a copy to the guest so they
 * have a record. Replaces the mailto link when Brevo is configured; the
 * dialog falls back to mailto when it is not.
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

export async function sendInquiryEmail(
  input: InquiryEmailInput,
): Promise<{ id?: string; skipped?: string; error?: string }> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return { skipped: "BREVO_API_KEY not configured" };
  const from = process.env.EMAIL_FROM_ADDRESS?.trim();
  if (!from) return { skipped: "EMAIL_FROM_ADDRESS not configured" };
  const to = process.env.INQUIRY_EMAIL?.trim();
  if (!to) return { skipped: "INQUIRY_EMAIL not configured" };

  const { subject, html, text } = renderInquiry(input);
  try {
    const res = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: from, name: "Kiwi Cloud Homes" },
        to: [{ email: to }],
        cc: [{ email: input.email, name: input.name }],
        replyTo: { email: input.email, name: input.name },
        subject,
        htmlContent: html,
        textContent: text,
        tags: ["inquiry", `locale:${input.locale}`],
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
