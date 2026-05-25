export type LogRow = {
  bookId: number;
  startPage: number;
  endPage: number;
  isCompleted: boolean;
};

export type BookSlice = {
  id: number;
  totalPages: number;
};

/** صفحات مقروءة في صف واحد — O(1). */
export function pagesInRow(row: LogRow): number {
  return Math.max(0, row.endPage - row.startPage + 1);
}

/** مجموع صفحات عدة صفوف — O(n) حيث n عدد الصفوف (عادة ≤ عدد كتب المرحلة). */
export function sumPages(rows: LogRow[]): number {
  let total = 0;
  for (const row of rows) total += pagesInRow(row);
  return total;
}

export function quotaRemainingAfter(rows: LogRow[], weeklyQuota: number): number {
  return Math.max(0, weeklyQuota - sumPages(rows));
}

export function normalizeRow(
  book: BookSlice,
  startPage: number,
  endPage: number
): LogRow {
  const actualStart = Math.max(1, startPage);
  const actualEnd = Math.min(Math.max(actualStart, endPage), book.totalPages);
  return {
    bookId: book.id,
    startPage: actualStart,
    endPage: actualEnd,
    isCompleted: actualEnd >= book.totalPages,
  };
}

/** هل استهلك الطالب كل ما تبقى في الكتاب الحالي؟ */
export function consumedAllAvailableInBook(
  book: BookSlice,
  row: LogRow,
  lastPage: number
): boolean {
  const remainingInBook = Math.max(0, book.totalPages - lastPage);
  if (remainingInBook <= 0) return true;
  return (
    row.isCompleted ||
    row.endPage >= book.totalPages ||
    pagesInRow(row) >= remainingInBook
  );
}

/**
 * هل نحتاج كتاباً إضافياً لإكمال النصاب بعد هذا الصف؟
 */
export function needsMultiBookContinuation(
  row: LogRow,
  book: BookSlice,
  lastPage: number,
  weeklyQuota: number
): { needed: boolean; remainingQuota: number } {
  const remainingQuota = quotaRemainingAfter([row], weeklyQuota);
  if (remainingQuota <= 0) {
    return { needed: false, remainingQuota: 0 };
  }
  if (!consumedAllAvailableInBook(book, row, lastPage)) {
    return { needed: false, remainingQuota };
  }
  return { needed: true, remainingQuota };
}

/** حقن نطاق الصفحات للكتاب — O(1). */
export function suggestPageRange(
  book: BookSlice,
  lastPage: number,
  weeklyQuota: number,
  pagesAlreadyInSession = 0
): { startPage: number; endPage: number } {
  const startPage = lastPage + 1;
  const remainingInBook = Math.max(0, book.totalPages - lastPage);
  const quotaLeft = Math.max(0, weeklyQuota - pagesAlreadyInSession);
  const pagesToRead = Math.max(1, Math.min(remainingInBook, quotaLeft));
  return { startPage, endPage: startPage + pagesToRead - 1 };
}

/** صف لكتاب تالي في حلقة النصاب — يقرأ على الأقل صفحة واحدة إن وُجد متبقٍ. */
export function buildRolloverRow(
  book: BookSlice,
  pagesNeeded: number,
  lastPage = 0
): LogRow {
  const startPage = lastPage + 1;
  const maxReadable = Math.max(0, book.totalPages - lastPage);
  const read = Math.max(1, Math.min(pagesNeeded, maxReadable));
  const endPage = startPage + read - 1;
  return {
    bookId: book.id,
    startPage,
    endPage,
    isCompleted: endPage >= book.totalPages,
  };
}

export function booksAvailableForRollover<T extends BookSlice>(
  availableBooks: T[],
  usedBookIds: Set<number>
): T[] {
  return availableBooks.filter((b) => !usedBookIds.has(b.id));
}
