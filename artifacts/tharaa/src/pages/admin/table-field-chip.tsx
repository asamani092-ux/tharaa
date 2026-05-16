import { cn } from "@/lib/utils";

type ChipTone = "neutral" | "gold" | "navy" | "mono";

const toneClass: Record<ChipTone, string> = {
  neutral:
    "bg-[var(--bg-tertiary)] text-[var(--text-primary)] border-[var(--border-default)] " +
    "light:bg-white light:text-[var(--text-primary)]",
  gold:
    "bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] border-[hsl(var(--primary))]/25 " +
    "light:bg-white light:text-[var(--secondary-600)] light:border-[var(--secondary-400)]",
  navy:
    "bg-[var(--primary-50)] text-[var(--primary-600)] border-[var(--primary-400)]/30 " +
    "light:bg-[var(--primary-50)] light:text-[var(--primary-800)]",
  mono:
    "bg-[var(--bg-tertiary)] text-[var(--secondary-400)] border-[var(--border-subtle)] font-mono font-semibold " +
    "light:bg-white light:text-[var(--secondary-600)] light:border-[var(--border-default)]",
};

export function TableFieldChip({
  children,
  tone = "neutral",
  className,
  dir,
}: {
  children: React.ReactNode;
  tone?: ChipTone;
  className?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <span
      dir={dir}
      className={cn(
        "inline-flex max-w-full items-center justify-center rounded-full border px-3 py-1 text-sm font-medium",
        toneClass[tone],
        className
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}
