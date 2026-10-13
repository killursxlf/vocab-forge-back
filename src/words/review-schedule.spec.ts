import { scheduleReview } from './review-schedule';

describe('Leitner review schedule', () => {
  const now = new Date('2026-10-11T12:00:00.000Z');
  const day = 86400000;

  it('advances successful reviews through increasing intervals and caps at 90 days', () => {
    [1, 3, 7, 14, 30, 90, 90].forEach((days, box) => {
      expect(scheduleReview(box, true, now)).toEqual({
        reviewBox: Math.min(box + 1, 6),
        nextReviewAt: new Date(now.getTime() + days * day),
      });
    });
  });

  it('returns forgotten words to box zero for a review in ten minutes', () => {
    for (let box = 0; box <= 6; box++) {
      expect(scheduleReview(box, false, now)).toEqual({
        reviewBox: 0,
        nextReviewAt: new Date(now.getTime() + 600000),
      });
    }
    expect(scheduleReview(0, true, now).reviewBox).toBe(1);
  });

  it('uses elapsed UTC time across daylight-saving changes', () => {
    const beforeDst = new Date('2026-10-24T23:30:00+02:00');
    expect(
      scheduleReview(0, true, beforeDst).nextReviewAt.getTime() -
        beforeDst.getTime(),
    ).toBe(day);
    expect(now.toISOString()).toBe('2026-10-11T12:00:00.000Z');
  });

  it.each([-1, 7, 0.5, NaN, Infinity])(
    'rejects an invalid persisted box: %s',
    (box) => {
      expect(() => scheduleReview(box, true, now)).toThrow(RangeError);
    },
  );
});
