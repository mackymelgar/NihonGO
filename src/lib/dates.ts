/**
 * Timezone-aware date helpers. All timestamps are stored in UTC; streak and
 * daily-quest day boundaries are computed in the user's local timezone.
 */

/** The IANA timezone detected from the browser (e.g. "Asia/Tokyo"). */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** The local calendar date (YYYY-MM-DD) for `date` in the given timezone. */
export function localDateString(timezone: string, date: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(date); // en-CA yields YYYY-MM-DD
}

/** Format a UTC timestamp for display in the user's timezone. */
export function formatDateTime(
  iso: string,
  timezone: string,
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
): string {
  return new Intl.DateTimeFormat(undefined, { timeZone: timezone, ...opts }).format(
    new Date(iso),
  );
}
