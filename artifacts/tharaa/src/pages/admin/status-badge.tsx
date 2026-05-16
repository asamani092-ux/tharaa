
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const isActive = status === "active";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1 text-xs font-semibold border",
        isActive
          ? "bg-[var(--success-600)] text-white border-transparent light:bg-white light:text-[var(--success-600)] light:border-[var(--success-600)]"
          : "bg-[var(--secondary-400)]/15 text-[var(--secondary-400)] border-[var(--secondary-400)]/30 light:bg-white light:text-[var(--secondary-600)] light:border-[var(--secondary-400)]"
      )}
    >
      {isActive ? "نشط" : "معلق"}
    </span>
  );
}
