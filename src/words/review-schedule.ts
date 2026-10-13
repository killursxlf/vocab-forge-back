const REVIEW_DAYS = [1, 3, 7, 14, 30, 90] as const;

/** A two-answer Leitner schedule; a miss returns the card to relearning. */
export function scheduleReview(box: number, knows: boolean, now: Date) {
  if (!Number.isInteger(box) || box < 0 || box > REVIEW_DAYS.length) {
    throw new RangeError('Invalid review box');
  }
  const reviewBox = knows ? Math.min(box + 1, REVIEW_DAYS.length) : 0;
  const delay = knows
    ? REVIEW_DAYS[reviewBox - 1] * 24 * 60 * 60 * 1000
    : 10 * 60 * 1000;
  return { reviewBox, nextReviewAt: new Date(now.getTime() + delay) };
}
