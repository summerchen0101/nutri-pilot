import { cn } from '@/lib/utils/cn';

interface SegmentedTabOption<T extends string> {
  id: T;
  label: string;
  disabled?: boolean;
}

interface SegmentedTabsProps<T extends string> {
  value: T;
  options: ReadonlyArray<SegmentedTabOption<T>>;
  onChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
}

export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div
      className={cn(
        'flex rounded-[10px] border-[0.5px] border-border bg-secondary/40 p-1',
        className,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          disabled={option.disabled}
          onClick={() => onChange(option.id)}
          className={cn(
            'flex-1 rounded-lg py-2 text-[13px] font-medium transition-colors',
            value === option.id
              ? 'bg-[#1E212B] text-white hover:bg-[#2A2F3D]'
              : 'text-muted-foreground hover:text-foreground',
            option.disabled ? 'cursor-not-allowed opacity-40' : '',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
