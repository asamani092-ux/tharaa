/** أعمدة تصدير إحصائيات المشرف — تطابق حقول analytics.php usersDetail */

export const ANALYTICS_EXPORT_HEADERS = [
  "الاسم",
  "الدفعة",
  "المسار",
  "إنجاز مرحلي %",
  "تقدم تراكمي للدفعة %",
  "هدف الدفعة (صف)",
  "تحفيز أساسي (صف)",
  "تحفيز اختياري (صف)",
  "تقدم رسمي (صف)",
  "تقدم أساسي (صف)",
  "التزام",
  "أسبوع الدفعة",
  "ختم المسار الأساسي",
  "عدد كتب مكتملة",
  "إجمالي صفحات المسار الأساسي",
  "تقدم المنهج بالكتب %",
] as const;

export function analyticsRowToExportCells(s: Record<string, unknown>): (string | number)[] {
  return [
    String(s.name ?? ""),
    String(s.batchName ?? ""),
    String(s.trackLabelAr ?? s.effectiveTrack ?? ""),
    Number(s.stageCompletionRate ?? 0),
    Number(s.batchCumulativeRate ?? 0),
    Number(s.batchPaceTarget ?? 0),
    Number(s.gamificationPages ?? 0),
    Number(s.gamificationPagesOptional ?? 0),
    Number(s.totalReadPages ?? 0),
    Number(s.progressPagesCore ?? 0),
    Number(s.commitmentIndex ?? 0),
    Number(s.batchWeekNow ?? 0),
    s.trackCompleted ? "نعم" : "لا",
    Number(s.completedBooksCount ?? 0),
    Number(s.totalCoreTrackPages ?? 0),
    Number(s.curriculumBooksProgressRate ?? 0),
  ];
}

export function downloadAnalyticsExcel(
  rows: Record<string, unknown>[],
  meta?: { batchLabel?: string; trackLabel?: string }
) {
  const headerRow = ANALYTICS_EXPORT_HEADERS.map((h) => `<th>${h}</th>`).join("");
  const dataRows = rows
    .map((s) => {
      const cells = analyticsRowToExportCells(s);
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    })
    .join("");

  const metaRows = meta
    ? `<tr><td colspan="${ANALYTICS_EXPORT_HEADERS.length}">دفعة: ${meta.batchLabel ?? "الكل"} | مسار: ${meta.trackLabel ?? "الكل"} | تاريخ: ${new Date().toLocaleString("ar-SA")}</td></tr>`
    : "";

  const html = `<html dir="rtl"><head><meta charset="UTF-8"></head><body><table border="1">${metaRows}<tr>${headerRow}</tr>${dataRows}</table></body></html>`;
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `analytics-${Date.now()}.xls`;
  a.click();
  URL.revokeObjectURL(a.href);
}
