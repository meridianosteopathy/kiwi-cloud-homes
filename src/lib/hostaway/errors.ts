/**
 * Thrown by a booking engine when a paid reservation cannot be written and
 * retrying will not help: the nights were taken between the quote and the
 * payment, the listing is not one the engine knows, or the payment currency
 * does not match the property. The Stripe webhook treats it differently from
 * a transient failure: it alerts the owner, then stops Stripe retrying.
 */
export type ReservationRejectionReason =
  | "unavailable"
  | "unknown_listing"
  | "currency_mismatch";

export class ReservationRejectedError extends Error {
  constructor(
    public readonly reason: ReservationRejectionReason,
    message: string,
  ) {
    super(message);
    this.name = "ReservationRejectedError";
  }
}
