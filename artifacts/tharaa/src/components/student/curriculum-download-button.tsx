import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  href: string;
  className?: string;
};

/** رابط تنزيل منهج PDF — ثيم فاتح/داكن (كحلي / أبيض) */
export function CurriculumDownloadButton({ href, className }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--radius-lg)] border px-4 py-2.5",
        "text-sm font-semibold transition-colors shrink-0",
        "border-[var(--border-default)] bg-[var(--bg-primary)] text-[#1e3a5f]",
        "hover:bg-[var(--bg-tertiary)] hover:border-[var(--secondary-400)]",
        "dark:bg-[#1a2332] dark:border-[#3d4f66] dark:text-white",
        "dark:hover:bg-[#243044] dark:hover:border-[var(--secondary-400)]",
        className
      )}
    >
      <Download className="w-4 h-4 shrink-0" aria-hidden />
      <span>تنزيل المنهج</span>
    </a>
  );
}
