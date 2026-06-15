import {
  WECHAT_ORDER_MAX_RANGE_SECONDS,
  splitWechatOrderRanges,
} from './wechat-order-sync.util';

describe('wechat-order-sync.util', () => {
  describe('splitWechatOrderRanges', () => {
    it('splits long ranges into contiguous 7-day windows', () => {
      const startTime = 1000;
      const endTime = startTime + WECHAT_ORDER_MAX_RANGE_SECONDS * 2 + 12;

      const ranges = splitWechatOrderRanges(startTime, endTime);

      expect(ranges).toEqual([
        {
          startTime,
          endTime: startTime + WECHAT_ORDER_MAX_RANGE_SECONDS,
        },
        {
          startTime: startTime + WECHAT_ORDER_MAX_RANGE_SECONDS,
          endTime: startTime + WECHAT_ORDER_MAX_RANGE_SECONDS * 2,
        },
        {
          startTime: startTime + WECHAT_ORDER_MAX_RANGE_SECONDS * 2,
          endTime,
        },
      ]);
    });

    it('returns one range when duration is within the WeChat limit', () => {
      expect(splitWechatOrderRanges(1000, 2000)).toEqual([
        { startTime: 1000, endTime: 2000 },
      ]);
    });
  });
});
