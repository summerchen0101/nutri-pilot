import {
  memberOrderStatusLabel,
  memberOrderStatusTagClass,
  memberSubOrderStatusLabel,
  memberSubOrderStatusTagClass,
} from '@/app/(main)/settings/_lib/member-order-status-label';
import { cn } from '@/lib/utils/cn';

const TAG_BASE_CLASS = 'inline-flex rounded-full px-2.5 py-0.5 text-caption font-medium';

export interface MemberOrderStatusTagProps {
  status: string | null | undefined;
  className?: string;
}

export function MemberOrderStatusTag({ status, className }: MemberOrderStatusTagProps) {
  return (
    <span className={cn(TAG_BASE_CLASS, memberOrderStatusTagClass(status), className)}>
      {memberOrderStatusLabel(status)}
    </span>
  );
}

export interface MemberSubOrderStatusTagProps {
  status: string | null | undefined;
  className?: string;
}

export function MemberSubOrderStatusTag({
  status,
  className,
}: MemberSubOrderStatusTagProps) {
  return (
    <span className={cn(TAG_BASE_CLASS, memberSubOrderStatusTagClass(status), className)}>
      {memberSubOrderStatusLabel(status)}
    </span>
  );
}
