"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Props = {
  listingId: string;
  listingName: string;
  inquiryEmail: string | null;
  initialCheckIn: string;
  initialCheckOut: string;
  initialGuests: number;
  locale: string;
  onClose: () => void;
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function composeMailto(opts: {
  to: string;
  subject: string;
  body: string;
}): string {
  return `mailto:${encodeURIComponent(opts.to)}?subject=${encodeURIComponent(opts.subject)}&body=${encodeURIComponent(opts.body)}`;
}

export function InquiryDialog({
  listingId,
  listingName,
  inquiryEmail,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  locale,
  onClose,
}: Props) {
  const t = useTranslations("Inquiry");
  const titleId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);
  const [message, setMessage] = useState("");
  // Hidden field a person never sees; bots fill it and the server drops those.
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Close on Escape; focus the close button on mount.
  useEffect(() => {
    closeBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const minDate = todayISO();
  const canSubmit =
    Boolean(inquiryEmail) &&
    name.trim() &&
    email.trim() &&
    checkIn &&
    checkOut;

  function openMailApp() {
    if (!inquiryEmail) return;
    const subject = t("emailSubject", { listing: listingName });
    const body = t("emailBody", {
      listing: listingName,
      listingId,
      name,
      email,
      phone: phone || "—",
      checkIn,
      checkOut,
      guests,
      message: message || "—",
      locale,
    });

    window.location.href = composeMailto({
      to: inquiryEmail,
      subject,
      body,
    });
  }

  /**
   * Send through the site (the owner gets an email, the guest a copy). When
   * email is not configured on the server the dialog falls back to opening
   * the guest's own mail app, as it always did.
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!inquiryEmail || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/booking/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          listingId,
          listingName,
          name,
          email,
          phone,
          checkIn,
          checkOut,
          guests,
          message,
          locale,
          website,
        }),
      });
      if (res.ok) {
        setStatus("sent");
        return;
      }
      if (res.status === 503) {
        setStatus("idle");
        openMailApp();
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-kiwi-200 bg-white px-3 py-2 text-sm text-kiwi-900 shadow-sm focus:border-kiwi-500 focus:outline-none focus:ring-2 focus:ring-kiwi-200";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-kiwi-100 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-kiwi-900">
              {t("title")}
            </h2>
            <p className="mt-1 text-xs text-kiwi-600">
              {t("subtitle", { listing: listingName })}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded-full p-1 text-kiwi-600 hover:bg-kiwi-50 hover:text-kiwi-900"
          >
            <span aria-hidden className="text-xl leading-none">×</span>
          </button>
        </header>

        {status === "sent" ? (
          <div className="space-y-4 px-5 py-6">
            <h3 className="text-base font-semibold text-kiwi-900">{t("sentTitle")}</h3>
            <p className="text-sm text-kiwi-800">{t("sentBody", { email })}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-kiwi-600 px-4 py-2 text-sm font-medium text-white hover:bg-kiwi-700"
              >
                {t("close")}
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-3 px-5 py-4">
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="hidden"
          />
          {!inquiryEmail && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {t("missingHostEmail")}
            </div>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-kiwi-700">
              {t("yourName")}
            </span>
            <input
              required
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-kiwi-700">
                {t("yourEmail")}
              </span>
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-kiwi-700">
                {t("yourPhone")}
              </span>
              <input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-kiwi-700">
                {t("checkIn")}
              </span>
              <input
                required
                type="date"
                min={minDate}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-kiwi-700">
                {t("checkOut")}
              </span>
              <input
                required
                type="date"
                min={checkIn || minDate}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-kiwi-700">
              {t("guests")}
            </span>
            <input
              required
              type="number"
              min={1}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-kiwi-700">
              {t("message")}
            </span>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
              className={inputClass}
            />
          </label>

          {status === "error" ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800" role="alert">
              {t("sendFailed")}{" "}
              <button type="button" onClick={openMailApp} className="font-medium underline underline-offset-2">
                {t("openEmail")}
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-kiwi-500">{t("sendNote")}</p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-kiwi-200 px-4 py-2 text-sm text-kiwi-700 hover:bg-kiwi-50"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={!canSubmit || status === "sending"}
              className="rounded-full bg-kiwi-600 px-4 py-2 text-sm font-medium text-white hover:bg-kiwi-700 disabled:cursor-not-allowed disabled:bg-kiwi-300"
            >
              {status === "sending" ? t("sending") : t("send")}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
