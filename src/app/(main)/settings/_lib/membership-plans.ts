export const MEMBERSHIP_DISCLAIMER =
  '訂閱扣款開通後將以藍新定期定額每月自動扣款；月費轉為購物點（1點1元）之發放與折抵規則，以正式方案條款為準。';

export const MEMBERSHIP_CURRENT_PLAN_LABEL = '目前方案：免費';

export const MEMBERSHIP_CARD_INTRO =
  '付費會員為固定月繳，每月自動扣款；月費將轉為購物點（1點可折抵1元商城消費，依方案條款）。';

export interface MembershipPlanDefinition {
  readonly id: 'free' | 'plus' | 'pro';
  readonly name: string;
  readonly monthlyPriceLabel: string;
  readonly highlight: string;
  readonly bullets: readonly string[];
}

export const MEMBERSHIP_PLANS: readonly MembershipPlanDefinition[] = [
  {
    id: 'free',
    name: '免費',
    monthlyPriceLabel: 'NT$0',
    highlight: '基礎飲食紀錄、守衛與商城購物',
    bullets: ['依飲食偏好瀏覽推薦商品', '單次結帳與配送'],
  },
  {
    id: 'plus',
    name: '進階',
    monthlyPriceLabel: 'NT$199／月',
    highlight: '月繳 NT$199，每月自動扣款；轉為等值購物點（依方案條款）',
    bullets: ['1點可折抵商城1元（依方案條款）', '更多會員權益即將推出'],
  },
  {
    id: 'pro',
    name: '專業',
    monthlyPriceLabel: 'NT$399／月',
    highlight: '月繳 NT$399，每月自動扣款；轉為等值購物點（依方案條款）',
    bullets: ['更高購物點額度（詳見方案說明）', '更多會員權益即將推出'],
  },
] as const;

export const MEMBERSHIP_BROWSE_SHOP_LABEL = '逛逛商城';

export const MEMBERSHIP_BROWSE_SHOP_HREF = '/shop';
