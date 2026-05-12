/**
 * Default check-in / check-out for a given month chosen on the school journey.
 * Picks the next occurrence of that month (this year if it's still ahead,
 * next year if it's passed) and defaults the stay to 7 nights.
 */
export function defaultDatesForMonth(
  monthNum: number | null | undefined,
  defaultNights = 7,
): { checkIn: string | null; checkOut: string | null } {
  if (!monthNum || !Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    return { checkIn: null, checkOut: null };
  }

  const now = new Date();
  const nowMonth = now.getUTCMonth() + 1;
  const nowYear = now.getUTCFullYear();
  const year = monthNum >= nowMonth ? nowYear : nowYear + 1;

  const checkIn = new Date(Date.UTC(year, monthNum - 1, 1));
  const checkOut = new Date(checkIn);
  checkOut.setUTCDate(checkOut.getUTCDate() + defaultNights);

  return {
    checkIn: checkIn.toISOString().slice(0, 10),
    checkOut: checkOut.toISOString().slice(0, 10),
  };
}
