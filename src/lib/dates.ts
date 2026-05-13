/**
 * Default check-in / check-out for a given month chosen on the school journey.
 *
 * Picks the next occurrence of that month (this year if it's still ahead,
 * next year if it's passed) and pre-fills the picker with the FULL month —
 * 1st to the last day — so school-visit guests can review and tighten the
 * range to whatever suits their plan.
 */
export function defaultDatesForMonth(
  monthNum: number | null | undefined,
): { checkIn: string | null; checkOut: string | null } {
  if (!monthNum || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    return { checkIn: null, checkOut: null };
  }

  const now = new Date();
  const nowMonth = now.getUTCMonth() + 1;
  const nowYear = now.getUTCFullYear();
  const year = monthNum >= nowMonth ? nowYear : nowYear + 1;

  const checkIn = new Date(Date.UTC(year, monthNum - 1, 1));
  // Last day of monthNum: day 0 of the following month.
  const checkOut = new Date(Date.UTC(year, monthNum, 0));

  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
}
