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
  pagesAlreadyInSession = 0,
  /** عند false (إنجاز إضافي) لا يُقيَّد بالنصاب الأسبوعي */
  capByWeeklyQuota = true
): { startPage: number; endPage: number } {
  const startPage = lastPage + 1;
  const remainingInBook = Math.max(0, book.totalPages - lastPage);
  const quotaLeft = capByWeeklyQuota
    ? Math.max(0, weeklyQuota - pagesAlreadyInSession)
    : remainingInBook;
  const pagesToRead = Math.max(1, Math.min(remainingInBook, quotaLeft));
  return { startPage, endPage: startPage + pagesToRead - 1 };
}

/**
 * صف لكتاب تالي — اقتراح افتراضي (حد أدنى ≈ المتبقي من النصاب).
 * واجهة الرصد قد تسمح بمدى أوسع عبر validatePageRangeAgainstBook.
 */
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

/** صفحات قابلة للقراءة في الكتاب من موضع lastPage — O(1). */
export function readablePagesInBook(book: BookSlice, lastPage: number): number {
  return Math.max(0, book.totalPages - lastPage);
}

export type PageRangeValidation = {
  ok: boolean;
  message?: string;
  normalizedEnd: number;
};

/**
 * تحقق من نطاق الصفحات وسقف الكتاب — O(1).
 */
export function bookTotalPages(book: BookSlice): number {
  return Math.max(0, Number(book.totalPages) || 0);
}

/** يقيّد من/إلى ضمن حدود الكتاب وموضع lastPage — O(1). */
export function clampPageRangeToBook(
  book: BookSlice,
  startPage: number,
  endPage: number,
  lastPage: number
): { startPage: number; endPage: number } {
  const total = bookTotalPages(book);
  if (total <= 0) {
    return { startPage: 1, endPage: 1 };
  }
  const minStart = Math.max(1, lastPage + 1);
  const start = Math.min(total, Math.max(minStart, startPage));
  const end = Math.min(total, Math.max(start, endPage));
  return { startPage: start, endPage: end };
}

export function validatePageRangeAgainstBook(
  book: BookSlice,
  startPage: number,
  endPage: number,
  lastPage: number
): PageRangeValidation {
  const total = bookTotalPages(book);
  if (total <= 0) {
    return { ok: false, message: "بيانات الكتاب غير صالحة", normalizedEnd: 1 };
  }

  if (startPage < 1) {
    return { ok: false, message: "صفحة البداية غير صالحة", normalizedEnd: Math.min(endPage, total) };
  }
  if (startPage > total) {
    return {
      ok: false,
      message: `الكتاب ${total} صفحة فقط — صحّح صفحة البداية`,
      normalizedEnd: total,
    };
  }
  if (endPage > total) {
    return {
      ok: false,
      message: `لا يمكن تجاوز صفحة ${total} (إجمالي صفحات الكتاب)`,
      normalizedEnd: total,
    };
  }
  if (startPage > endPage) {
    return {
      ok: false,
      message: "صفحة النهاية يجب أن تكون أكبر من أو تساوي صفحة البداية",
      normalizedEnd: endPage,
    };
  }

  const minStart = Math.max(1, lastPage + 1);
  if (startPage < minStart) {
    return {
      ok: false,
      message: `ابدأ من صفحة ${minStart} فأعلى (آخر موضع مسجّل في الكتاب)`,
      normalizedEnd: Math.min(total, Math.max(minStart, endPage)),
    };
  }

  const normalizedEnd = endPage;
  const maxReadable = readablePagesInBook(book, lastPage);
  const requested = normalizedEnd - startPage + 1;
  if (requested > maxReadable) {
    return {
      ok: false,
      message: `متبقي ${maxReadable} صفحة فقط في هذا الكتاب (حتى صفحة ${total})`,
      normalizedEnd: Math.min(total, startPage + maxReadable - 1),
    };
  }
  return { ok: true, normalizedEnd };
}
