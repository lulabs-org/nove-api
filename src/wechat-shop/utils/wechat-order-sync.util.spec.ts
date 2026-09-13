import {
  MAX_TIME_RANGE_SECONDS,
  splitTimeRanges,
} from './wechat-order-sync.util';

describe('wechat-order-sync.util', () => {
  describe('splitTimeRanges', () => {
    it('splits long ranges into contiguous 7-day windows', () => {
      const startTime = 1000;
      const endTime = startTime + MAX_TIME_RANGE_SECONDS * 2 + 12;

      const ranges = splitTimeRanges(startTime, endTime);

      expect(ranges).toEqual([
        {
          startTime: startTime,
          endTime: startTime + MAX_TIME_RANGE_SECONDS,
        },
        {
          startTime: startTime + MAX_TIME_RANGE_SECONDS + 1,
          endTime: startTime + MAX_TIME_RANGE_SECONDS * 2 + 1,
        },
        {
          startTime: startTime + MAX_TIME_RANGE_SECONDS * 2 + 2,
          endTime: endTime,
        },
      ]);
    });

    it('returns one range when duration is within the WeChat limit', () => {
      expect(splitTimeRanges(1000, 2000)).toEqual([
        { startTime: 1000, endTime: 2000 },
      ]);
    });

    it('splits long ranges into contiguous 24-hour windows for aftersale', () => {
      const startTime = 1000;
      const oneDay = 24 * 60 * 60;
      const endTime = startTime + oneDay * 2 + 10;

      const ranges = splitTimeRanges(startTime, endTime, oneDay);

      expect(ranges).toEqual([
        {
          startTime: startTime,
          endTime: startTime + oneDay,
        },
        {
          startTime: startTime + oneDay + 1,
          endTime: startTime + oneDay * 2 + 1,
        },
        {
          startTime: startTime + oneDay * 2 + 2,
          endTime: endTime,
        },
      ]);
    });
  });
});
