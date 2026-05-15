"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { isStripeTestMode } from "@/lib/stripe/mode";

type Quote = {
  listingId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  currency: string;
  total: number;
  totalMinor: number;
  breakdown: Array<{
    label: "nightly" | "cleaning";
    amount: number;
    meta?: { nights?: number; nightly?: number };
  }>;
};

type Props = {
  listingId: string;
  listingName: string;
  initialCheckIn: string;
  initialCheckOut: string;
  initialGuests: number;
  onClose: () => void;
};

const STRIPE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise(): Promise<Stripe | null> | null {
  if (!STRIPE_KEY) return null;
  if (!stripePromise) stripePromise = loadStripe(STRIPE_KEY);
  return stripePromise;
}

type Step = "review" | "pay" | "done";

export function CheckoutDialog({
  listingId,
  listingName,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  onClose,
}: Props) {
  const t = useTranslations("Checkout");
  const locale = useLocale();
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const [step, setStep] = useState<Step>("review");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    closeBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Fetch the quote on mount.
  useEffect(() => {
    let cancelled = false;
    setQuoteError(null);
    fetch("/api/booking/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkIn: initialCheckIn,
        checkOut: initialCheckOut,
        guests: initialGuests,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Quote failed");
        return data as Quote;
      })
      .then((q) => {
        if (!cancelled) setQuote(q);
      })
      .catch((e: Error) => {
        if (!cancelled) setQuoteError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [initialCheckIn, initialCheckOut, initialGuests]);

  async function startPayment(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!quote || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/booking/payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkIn: quote.checkIn,
          checkOut: quote.checkOut,
          guests: quote.guests,
          guestName: name.trim(),
          guestEmail: email.trim(),
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start payment");
      setClientSecret(data.clientSecret);
      setStep("pay");
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : "Could not start payment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
    >
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <header className="sticky top-0 flex items-start justify-between gap-3 border-b border-kiwi-100 bg-white px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-kiwi-900">
              {t(`title.${step}`)}
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

        <div className="px-5 py-4">
          {step === "review" && (
            <ReviewStep
              listingName={listingName}
              quote={quote}
              quoteError={quoteError}
              name={name}
              email={email}
              submitting={submitting}
              onNameChange={setName}
              onEmailChange={setEmail}
              onSubmit={startPayment}
              onCancel={onClose}
            />
          )}
          {step === "pay" && quote && clientSecret && (
            <StripePay
              clientSecret={clientSecret}
              quote={quote}
              onSuccess={() => setStep("done")}
              onBack={() => setStep("review")}
            />
          )}
          {step === "done" && quote && (
            <DoneStep quote={quote} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function QuoteBreakdown({ quote }: { quote: Quote }) {
  const t = useTranslations("Checkout");
  const format = useFormatter();
  const money = (amount: number) =>
    format.number(amount, {
      style: "currency",
      currency: quote.currency,
      maximumFractionDigits: 0,
    });

  return (
    <dl className="space-y-1.5 rounded-lg bg-kiwi-50/60 p-3 text-sm">
      {quote.breakdown.map((line, i) => (
        <div key={i} className="flex items-baseline justify-between">
          <dt className="text-kiwi-700">
            {line.label === "nightly" && line.meta?.nightly !== undefined
              ? t("nightlyBreakdown", {
                  price: money(line.meta.nightly),
                  nights: line.meta.nights ?? quote.nights,
                })
              : t(`lineLabel.${line.label}`)}
          </dt>
          <dd className="tabular-nums text-kiwi-900">{money(line.amount)}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t border-kiwi-100 pt-1.5 font-semibold">
        <dt className="text-kiwi-900">{t("total")}</dt>
        <dd className="tabular-nums text-kiwi-900">{money(quote.total)}</dd>
      </div>
    </dl>
  );
}

function ReviewStep(props: {
  listingName: string;
  quote: Quote | null;
  quoteError: string | null;
  name: string;
  email: string;
  submitting: boolean;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Checkout");
  const inputClass =
    "w-full rounded-lg border border-kiwi-200 bg-white px-3 py-2 text-sm text-kiwi-900 shadow-sm focus:border-kiwi-500 focus:outline-none focus:ring-2 focus:ring-kiwi-200";

  if (props.quoteError && !props.quote) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {props.quoteError}
        </div>
        <button
          type="button"
          onClick={props.onCancel}
          className="w-full rounded-full border border-kiwi-200 px-4 py-2 text-sm text-kiwi-700"
        >
          {t("close")}
        </button>
      </div>
    );
  }

  if (!props.quote) {
    return (
      <div className="py-8 text-center text-sm text-kiwi-600">
        {t("calculating")}
      </div>
    );
  }

  return (
    <form onSubmit={props.onSubmit} className="space-y-3">
      <div className="rounded-lg border border-kiwi-100 bg-white p-3 text-sm text-kiwi-800">
        <div className="flex justify-between gap-2">
          <span>{t("stay")}</span>
          <span className="tabular-nums text-kiwi-900">
            {props.quote.checkIn} → {props.quote.checkOut}
          </span>
        </div>
        <div className="flex justify-between gap-2">
          <span>{t("guests")}</span>
          <span className="tabular-nums text-kiwi-900">{props.quote.guests}</span>
        </div>
      </div>

      <QuoteBreakdown quote={props.quote} />

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-kiwi-700">
          {t("yourName")}
        </span>
        <input
          required
          type="text"
          autoComplete="name"
          value={props.name}
          onChange={(e) => props.onNameChange(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-kiwi-700">
          {t("yourEmail")}
        </span>
        <input
          required
          type="email"
          autoComplete="email"
          value={props.email}
          onChange={(e) => props.onEmailChange(e.target.value)}
          className={inputClass}
        />
      </label>

      {isStripeTestMode() && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
          {t("testModeNotice")}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={props.onCancel}
          className="rounded-full border border-kiwi-200 px-4 py-2 text-sm text-kiwi-700 hover:bg-kiwi-50"
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={props.submitting}
          className="rounded-full bg-kiwi-600 px-4 py-2 text-sm font-medium text-white hover:bg-kiwi-700 disabled:bg-kiwi-300"
        >
          {props.submitting ? t("starting") : t("continueToPayment")}
        </button>
      </div>
    </form>
  );
}

function StripePay({
  clientSecret,
  quote,
  onSuccess,
  onBack,
}: {
  clientSecret: string;
  quote: Quote;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("Checkout");
  const promise = getStripePromise();

  if (!promise) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
        {t("missingStripeKey")}
      </div>
    );
  }

  return (
    <Elements
      stripe={promise}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <StripePayForm quote={quote} onSuccess={onSuccess} onBack={onBack} />
    </Elements>
  );
}

function StripePayForm({
  quote,
  onSuccess,
  onBack,
}: {
  quote: Quote;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("Checkout");
  const format = useFormatter();
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalLabel = format.number(quote.total, {
    style: "currency",
    currency: quote.currency,
    maximumFractionDigits: 0,
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Stripe needs a return_url even when we don't expect a redirect.
        return_url: typeof window !== "undefined" ? window.location.href : "",
      },
      redirect: "if_required",
    });
    if (stripeError) {
      setError(stripeError.message ?? "Payment failed.");
      setSubmitting(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      onSuccess();
    } else {
      setError(t("paymentIncomplete", { status: paymentIntent?.status ?? "?" }));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <QuoteBreakdown quote={quote} />
      <PaymentElement />
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="rounded-full border border-kiwi-200 px-4 py-2 text-sm text-kiwi-700 hover:bg-kiwi-50 disabled:opacity-50"
        >
          {t("back")}
        </button>
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="rounded-full bg-kiwi-600 px-4 py-2 text-sm font-medium text-white hover:bg-kiwi-700 disabled:bg-kiwi-300"
        >
          {submitting ? t("paying") : t("payNow", { amount: totalLabel })}
        </button>
      </div>
    </form>
  );
}

function DoneStep({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const t = useTranslations("Checkout");
  const format = useFormatter();
  const total = format.number(quote.total, {
    style: "currency",
    currency: quote.currency,
    maximumFractionDigits: 0,
  });

  return (
    <div className="space-y-3 text-sm">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
        {t("paymentCaptured", { amount: total })}
      </div>
      <div className="rounded-lg border border-kiwi-100 bg-white p-3">
        <p className="text-kiwi-800">{t("nextSteps")}</p>
        <ul className="mt-2 list-disc pl-5 text-kiwi-700">
          <li>{t("stayDates", { checkIn: quote.checkIn, checkOut: quote.checkOut })}</li>
          <li>{t("guestsLine", { count: quote.guests })}</li>
          <li>{t("reservationProcessing")}</li>
        </ul>
      </div>
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
  );
}
