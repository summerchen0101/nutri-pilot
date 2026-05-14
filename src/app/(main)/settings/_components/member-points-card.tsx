import { Coins } from 'lucide-react';

import { SectionCard } from '@/components/ui/section-card';
import { SectionHeading } from '@/components/ui/section-heading';

interface MemberPointsCardProps {
  balance: number;
}

export function MemberPointsCard({ balance }: MemberPointsCardProps) {
  return (
    <SectionCard>
      <SectionHeading icon={Coins} className="mb-2">
        會員購物點
      </SectionHeading>
      <div className="flex items-baseline gap-2">
        <span className="text-heading-page text-primary">{balance.toLocaleString()}</span>
        <span className="text-body text-foreground">點</span>
      </div>
      <p className="mt-1 text-caption leading-relaxed text-muted-foreground">
        訂閱月費會轉為購物點，1 點可折抵 1 元商城消費（依方案條款）。
      </p>
    </SectionCard>
  );
}
