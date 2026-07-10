import { cn } from "@/lib/utils";

type BookLevel = "basic" | "optional";

function resolveLevel(levelType?: string | null): BookLevel {
  const lt = (levelType ?? "basic").trim().toLowerCase();
  if (lt === "optional" || lt === "اختياري" || lt === "إختياري") {
    return "optional";
  }
  return "basic";
}

/** شارة نوع الكتاب — أساسي (ذهبي صلب) / اختياري (إطار ذهبي) */
export function BookLevelBadge({ levelType }: { levelType?: string | null }) {
  const level = resolveLevel(levelType);

  if (level === "basic") {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-0.5",
          "text-[10px] font-bold leading-none text-white",
          "bg-[#C59D5F] border border-[#B89355]",
          "shadow-[0_1px_2px_rgba(0,0,0,0.12)]",
          "dark:bg-[#C59D5F] dark:border-[#D4AD6A] dark:text-white"
        )}
      >
        أساسي
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full px-2.5 py-0.5",
        "text-[10px] font-bold leading-none",
        "border-2 border-[#C59D5F] text-[#9A7A42]",
        "bg-[var(--bg-primary)]",
        "dark:border-[#D4AD6A] dark:text-[#E8C88A] dark:bg-[var(--bg-tertiary)]"
      )}
    >
      اختياري
    </span>
  );
}

export function isBasicCurriculumBook(book: { levelType?: string | null }): boolean {
  return resolveLevel(book.levelType) === "basic";
}
