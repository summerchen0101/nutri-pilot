'use client';

import { useRouter } from 'next/navigation';
import { FiActivity, FiCoffee, FiUser } from 'react-icons/fi';

import { cn } from '@/lib/utils/cn';

export type LogSectionTab = 'food' | 'activity' | 'body';

type LogSectionTabsProps = {
  date: string;
  active: LogSectionTab;
} & (
  | { linkMode?: 'router' }
  | { linkMode: 'state'; onTabChange: (tab: LogSectionTab) => void }
);

export function LogSectionTabs(props: LogSectionTabsProps) {
  const router = useRouter();
  const { date, active } = props;

  function go(tab: LogSectionTab) {
    if (props.linkMode === 'state') {
      props.onTabChange(tab);
      return;
    }
    const p = new URLSearchParams();
    p.set('date', date);
    p.set('tab', tab);
    router.replace(`/log?${p.toString()}`);
  }

  const tabBtn = (tab: LogSectionTab, label: string, Icon: typeof FiCoffee) => (
    <button
      key={tab}
      type="button"
      role="tab"
      aria-selected={active === tab}
      onClick={() => go(tab)}
      className={cn(
        'flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors',
        active === tab
          ? 'bg-primary text-white'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex w-full gap-2" role="tablist" aria-label="紀錄類別">
      {tabBtn('food', '飲食', FiCoffee)}
      {tabBtn('activity', '運動', FiActivity)}
      {tabBtn('body', '其他', FiUser)}
    </div>
  );
}
