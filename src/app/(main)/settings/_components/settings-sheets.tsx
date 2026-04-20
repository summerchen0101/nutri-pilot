import { BottomSheetShell } from '@/components/ui/bottom-sheet-shell';
import { Input } from '@/components/ui/input';

interface OptionItem {
  readonly value: string;
  readonly label: string;
}

interface BaseSheetProps {
  open: boolean;
  onClose: () => void;
  pending?: boolean;
}

interface OptionSheetProps extends BaseSheetProps {
  title: string;
  options: ReadonlyArray<OptionItem>;
  selectedValue: string;
  error?: string | null;
  onSelect: (value: string) => void;
  onSave: () => void;
}

export function OptionSelectSheet({
  open,
  title,
  options,
  selectedValue,
  error,
  pending,
  onSelect,
  onSave,
  onClose,
}: OptionSheetProps) {
  return (
    <BottomSheetShell open={open} title={title} onClose={onClose}>
      <div className="grid gap-2 pb-3">
        {options.map((option) => {
          const active = selectedValue === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={[
                'w-full rounded-[10px] border px-3 py-2 text-left text-[13px]',
                active ? 'border-primary bg-primary-light text-primary-foreground' : 'border-neutral-border-tertiary text-foreground',
              ].join(' ')}
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          );
        })}
        {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
      </div>
      <button
        type="button"
        disabled={pending}
        className="w-full rounded-[10px] bg-shadow-grey py-2 text-[13px] font-medium text-white disabled:opacity-60"
        onClick={onSave}
      >
        儲存
      </button>
    </BottomSheetShell>
  );
}

interface NameSheetProps extends BaseSheetProps {
  value: string;
  error?: string | null;
  onChange: (next: string) => void;
  onSave: () => void;
}

export function EditNameSheet({ open, value, error, pending, onClose, onChange, onSave }: NameSheetProps) {
  return (
    <BottomSheetShell open={open} title="編輯姓名" onClose={onClose}>
      <div className="space-y-2 pb-3">
        <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="輸入名稱" className="text-[13px]" />
        {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
      </div>
      <button
        type="button"
        disabled={pending}
        className="w-full rounded-[10px] bg-shadow-grey py-2 text-[13px] font-medium text-white disabled:opacity-60"
        onClick={onSave}
      >
        儲存
      </button>
    </BottomSheetShell>
  );
}

interface BodyMetricsSheetProps extends BaseSheetProps {
  heightValue: string;
  weightValue: string;
  error?: string | null;
  onHeightChange: (next: string) => void;
  onWeightChange: (next: string) => void;
  onSave: () => void;
}

export function EditBodyMetricsSheet({
  open,
  heightValue,
  weightValue,
  error,
  pending,
  onClose,
  onHeightChange,
  onWeightChange,
  onSave,
}: BodyMetricsSheetProps) {
  return (
    <BottomSheetShell open={open} title="編輯身體數據" onClose={onClose}>
      <div className="space-y-2 pb-3">
        <div className="grid grid-cols-2 gap-2">
          <Input value={heightValue} inputMode="decimal" onChange={(event) => onHeightChange(event.target.value)} placeholder="身高 cm" className="text-[13px]" />
          <Input value={weightValue} inputMode="decimal" onChange={(event) => onWeightChange(event.target.value)} placeholder="體重 kg" className="text-[13px]" />
        </div>
        {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
      </div>
      <button
        type="button"
        disabled={pending}
        className="w-full rounded-[10px] bg-shadow-grey py-2 text-[13px] font-medium text-white disabled:opacity-60"
        onClick={onSave}
      >
        儲存
      </button>
    </BottomSheetShell>
  );
}

interface GoalInputSheetProps extends BaseSheetProps {
  title: string;
  value: string;
  placeholder: string;
  error?: string | null;
  disabled?: boolean;
  hint?: string;
  onChange: (next: string) => void;
  onSave: () => void;
}

export function GoalInputSheet({
  open,
  title,
  value,
  placeholder,
  error,
  disabled,
  hint,
  pending,
  onClose,
  onChange,
  onSave,
}: GoalInputSheetProps) {
  return (
    <BottomSheetShell open={open} title={title} onClose={onClose}>
      <div className="space-y-2 pb-3">
        <Input
          value={value}
          inputMode="decimal"
          className="text-[13px]"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
        {hint ? <p className="text-[11px] text-neutral-text-tertiary">{hint}</p> : null}
        {error ? <p className="text-[11px] text-destructive">{error}</p> : null}
      </div>
      <button
        type="button"
        disabled={pending}
        className="w-full rounded-[10px] bg-shadow-grey py-2 text-[13px] font-medium text-white disabled:opacity-60"
        onClick={onSave}
      >
        儲存
      </button>
    </BottomSheetShell>
  );
}

interface InfoSheetProps extends BaseSheetProps {
  title: string;
  description: string;
  valueText: string;
  onGoEdit: () => void;
}

export function GoalInfoSheet({
  open,
  title,
  description,
  valueText,
  onGoEdit,
  onClose,
}: InfoSheetProps) {
  return (
    <BottomSheetShell open={open} title={title} onClose={onClose}>
      <div className="space-y-2 pb-3">
        <p className="text-[11px] text-neutral-text-tertiary">{description}</p>
        <div className="rounded-[10px] border border-neutral-border-tertiary px-3 py-2 text-[13px] text-foreground">
          {valueText}
        </div>
        <button
          type="button"
          className="w-full rounded-[10px] border border-primary py-2 text-[13px] text-primary"
          onClick={onGoEdit}
        >
          編輯計算條件
        </button>
      </div>
      <button
        type="button"
        className="w-full rounded-[10px] bg-shadow-grey py-2 text-[13px] font-medium text-white"
        onClick={onClose}
      >
        關閉
      </button>
    </BottomSheetShell>
  );
}

interface AllergenSheetProps extends BaseSheetProps {
  options: ReadonlyArray<OptionItem>;
  selected: string[];
  avoidFoods: string[];
  avoidInput: string;
  onToggle: (value: string) => void;
  onInputChange: (next: string) => void;
  onAddAvoid: () => void;
  onRemoveAvoid: (item: string) => void;
  onSave: () => void;
}

export function EditAllergenSheet({
  open,
  options,
  selected,
  avoidFoods,
  avoidInput,
  pending,
  onClose,
  onToggle,
  onInputChange,
  onAddAvoid,
  onRemoveAvoid,
  onSave,
}: AllergenSheetProps) {
  return (
    <BottomSheetShell open={open} title="編輯忌食 / 過敏" onClose={onClose}>
      <div className="grid gap-2 pb-3">
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              className={[
                'w-full rounded-[10px] border px-3 py-2 text-left text-[13px]',
                checked ? 'border-primary bg-primary-light text-primary-foreground' : 'border-neutral-border-tertiary text-foreground',
              ].join(' ')}
              onClick={() => onToggle(option.value)}
            >
              {option.label}
            </button>
          );
        })}
        <div className="flex items-center gap-2">
          <Input
            value={avoidInput}
            className="min-w-0 flex-1"
            onChange={(event) => onInputChange(event.target.value)}
            placeholder="新增忌食項目"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onAddAvoid();
              }
            }}
          />
          <button
            type="button"
            className="h-10 shrink-0 whitespace-nowrap rounded-[10px] border border-primary px-3 text-[13px] text-primary"
            onClick={onAddAvoid}
          >
            新增
          </button>
        </div>
        {avoidFoods.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {avoidFoods.map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-full bg-secondary px-2 py-1 text-[11px] text-neutral-text-secondary"
                onClick={() => onRemoveAvoid(item)}
              >
                {item} ×
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <button
        type="button"
        disabled={pending}
        className="w-full rounded-[10px] bg-shadow-grey py-2 text-[13px] font-medium text-white disabled:opacity-60"
        onClick={onSave}
      >
        儲存
      </button>
    </BottomSheetShell>
  );
}
