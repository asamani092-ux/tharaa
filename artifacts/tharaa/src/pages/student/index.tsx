import { useState, useEffect, useMemo } from "react";
import {
  useGetMe,
  useListCurriculum,
  useGetSettings,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { StudentLayout } from "@/components/layout";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  BookOpen,
  CheckCircle,
  TrendingUp,
  Download,
  Info,
  Lightbulb,
  Send,
  Calendar,
  Check,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSubmissionWindow } from "@/lib/submissionWindow";
import {
  type LogRow,
  normalizeRow,
  pagesInRow,
  sumPages,
  quotaRemainingAfter,
  needsMultiBookContinuation,
  suggestPageRange,
  buildRolloverRow,
  booksAvailableForRollover,
  consumedAllAvailableInBook,
} from "@/lib/weeklyLogEngine";

const WEEKLY_QUOTA = 75;

const STUDENT_SURFACE_CARD =
  "rounded-[var(--radius-xl)] border-2 border-[var(--border-strong)] bg-[var(--bg-primary)] shadow-[var(--shadow-md)]";

const COMPLETED_BADGE_CLASS =
  "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold "
  + "bg-white text-[var(--success-600)] border border-[var(--success-600)]";


type StudentAnalyticsMe = {
  effectiveTrack?: string;
  stageCompletionRate?: number;
  gamificationPages?: number;
  expectedFinishHint?: string;
};

const STUDENT_ANALYTICS_ME_KEY = ["student-analytics-me"] as const;
const WEEKLY_LOG_STATUS_KEY = ["logs-weekly-status"] as const;
const EMPTY_COMPLETED_BOOKS: number[] = [];

export default function StudentPortal() {
  const queryClient = useQueryClient();
  const { data: session } = useGetMe();
  const user = session?.user;

  const { data: settings } = useGetSettings();
  const weeklyQuota = settings?.weeklyQuota || WEEKLY_QUOTA;
  const settingsWithDay = settings as
    | { primaryDay?: string; submissionStartDay?: number; allDaysActive?: boolean }
    | undefined;

  const submissionWindow = useMemo(
    () =>
      getSubmissionWindow({
        allDaysActive: settings?.allDaysActive,
        primaryDay: settingsWithDay?.primaryDay,
        submissionStartDay: settings?.submissionStartDay,
      }),
    [settings, settingsWithDay?.primaryDay, settings?.submissionStartDay, settings?.allDaysActive]
  );

  const { data: books } = useListCurriculum();

  const { data: analyticsPayload, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: STUDENT_ANALYTICS_ME_KEY,
    queryFn: async () => {
      try {
        const res = await fetch("/api/analytics.php?scope=me", { credentials: "include" });
        if (!res.ok) return { me: {} as StudentAnalyticsMe };
        return (await res.json()) as { me: StudentAnalyticsMe };
      } catch {
        return { me: {} as StudentAnalyticsMe };
      }
    },
    enabled: !!session?.authenticated,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const meAnalytics = analyticsPayload?.me;
  const effectiveTrack =
    (user as { effectiveTrack?: string })?.effectiveTrack ??
    meAnalytics?.effectiveTrack ??
    "full";

  const trackBooks = useMemo(
    () =>
      (books ?? []).filter(
        (b) =>
          (b as { trackType?: string }).trackType === "both" ||
          (b as { trackType?: string }).trackType === effectiveTrack
      ),
    [books, effectiveTrack]
  );

  const { data: weeklyLogStatus } = useQuery({
    queryKey: WEEKLY_LOG_STATUS_KEY,
    queryFn: async () => {
      const res = await fetch("/api/logs.php?id=status", { credentials: "include" });
      if (!res.ok) return { hasPrimaryThisWeek: false };
      return (await res.json()) as { hasPrimaryThisWeek?: boolean };
    },
    enabled: !!session?.authenticated,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const completedBookIds: number[] = user?.completedBooks ?? EMPTY_COMPLETED_BOOKS;
  const completedBookIdSet = useMemo(() => new Set<number>(completedBookIds), [completedBookIds]);

  const phaseStats = useMemo(() => {
    const totalsByPhase = new Map<number, { total: number; completed: number }>();
    for (const b of trackBooks) {
      const phase = b.phaseNumber;
      const row = totalsByPhase.get(phase) ?? { total: 0, completed: 0 };
      row.total += 1;
      if (completedBookIdSet.has(b.id)) row.completed += 1;
      totalsByPhase.set(phase, row);
    }
    const phases = Array.from(totalsByPhase.keys()).sort((a, b) => a - b);
    if (phases.length === 0) return [{ phase: 1, percent: 0 }];
    return phases.map((phase) => {
      const { total, completed } = totalsByPhase.get(phase)!;
      return { phase, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
    });
  }, [trackBooks, completedBookIdSet]);

  const [viewPhase, setViewPhase] = useState<number>(1);
  const [bookId, setBookId] = useState<string>("");
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(weeklyQuota);
  const [reflection, setReflection] = useState("");
  const [showReflection, setShowReflection] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [nextBookIdForRollover, setNextBookIdForRollover] = useState<string>("");
  const [pendingSubmissionData, setPendingSubmissionData] = useState<{
    rows: LogRow[];
    reflection?: string;
    remainingPages: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showCustomProgress, setShowCustomProgress] = useState(false);
  const [selectedCustomBooks, setSelectedCustomBooks] = useState<number[]>([]);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  const [hasPrimaryThisWeek, setHasPrimaryThisWeek] = useState(false);
  const [isExtraMode, setIsExtraMode] = useState(false);
  /** يمنع useEffect من إعادة حقن الصفحات فوق تعديل المستخدم */
  const [pagesManuallyEdited, setPagesManuallyEdited] = useState(false);

  type LogCardMode = "submitted" | "off-day" | "open";
  const logCardMode: LogCardMode = useMemo(() => {
    if (isExtraMode) return "open";
    if (hasPrimaryThisWeek) return "submitted";
    if (!submissionWindow.allowsPrimary) return "off-day";
    return "open";
  }, [isExtraMode, hasPrimaryThisWeek, submissionWindow.allowsPrimary]);

  useEffect(() => {
    if (user?.phaseNumber) setViewPhase(user.phaseNumber);
  }, [user?.phaseNumber]);

  useEffect(() => {
    if (!weeklyLogStatus?.hasPrimaryThisWeek) return;
    setHasPrimaryThisWeek(true);
  }, [weeklyLogStatus?.hasPrimaryThisWeek]);

  const displayedPhaseBooks = trackBooks.filter((b) => b.phaseNumber === viewPhase);
  const availableBooks = displayedPhaseBooks.filter((b) => !completedBookIds.includes(b.id));

  const lastPageForBook = (book: { id: number }) =>
    user?.currentBookId === book.id ? user?.lastPage ?? 0 : 0;

  const userCurrentBook = user?.currentBookId
    ? trackBooks.find((b) => b.id === user.currentBookId)
    : null;
  const isCurrentBookValid =
    !!userCurrentBook &&
    !completedBookIds.includes(userCurrentBook.id) &&
    userCurrentBook.phaseNumber === viewPhase;

  const currentBook = isCurrentBookValid ? userCurrentBook : availableBooks[0];
  const effectiveLastPage = isCurrentBookValid ? user?.lastPage || 0 : 0;
  const remainingInCurrentBook = currentBook
    ? Math.max(0, currentBook.totalPages - effectiveLastPage)
    : 0;
  const capPagesByQuota = !isExtraMode;

  useEffect(() => {
    setPagesManuallyEdited(false);
  }, [bookId, viewPhase, isExtraMode]);

  useEffect(() => {
    if (pagesManuallyEdited) return;

    const injectForBook = (book: (typeof trackBooks)[number]) => {
      const range = suggestPageRange(
        book,
        lastPageForBook(book),
        weeklyQuota,
        0,
        capPagesByQuota
      );
      setStartPage(range.startPage);
      setEndPage(range.endPage);
    };

    if (bookId) {
      const picked = displayedPhaseBooks.find((b) => b.id.toString() === bookId);
      if (picked) injectForBook(picked);
      return;
    }

    if (currentBook) {
      setBookId(currentBook.id.toString());
      injectForBook(currentBook);
      return;
    }

    setBookId("");
    setStartPage(1);
    setEndPage(capPagesByQuota ? weeklyQuota : 1);
  }, [
    bookId,
    viewPhase,
    isExtraMode,
    capPagesByQuota,
    currentBook?.id,
    weeklyQuota,
    pagesManuallyEdited,
    displayedPhaseBooks,
    user?.currentBookId,
    user?.lastPage,
  ]);

  const selectedBook = displayedPhaseBooks.find((b) => b.id.toString() === bookId);
  const pagesCount = Math.max(0, endPage - startPage + 1);
  const nextBook = availableBooks.find((b) => b.id !== currentBook?.id);

  const stageCompletionRate = Math.min(
    100,
    Math.round(meAnalytics?.stageCompletionRate ?? 0)
  );
  const gamificationPages = meAnalytics?.gamificationPages ?? 0;
  const expectedFinishHint = meAnalytics?.expectedFinishHint?.trim() || "—";

  const shareViaWhatsApp = () => {
    if (!reflection.trim() || !selectedBook) {
      toast.error("أكتب فائدة لكي تتمكن من المشاركة");
      return;
    }
    const message = `📚 *فائدة من كتاب: ${selectedBook.title}*\n\n"${reflection.trim()}"\n\n✨ تمت المشاركة عبر منصة ثراء المعرفة`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const submitLogs = async (
    rows: LogRow[],
    mode: "primary" | "extra",
    reflectionText?: string
  ) => {
    if (isSubmitting || rows.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/logs.php", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, reflection: reflectionText, rows }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل الرصد");

      if (mode === "primary") {
        setHasPrimaryThisWeek(true);
        setIsExtraMode(false);
        toast.success("شكراً لك! تم تسجيل رصدك الأسبوعي بنجاح");
      } else {
        setIsExtraMode(false);
        toast.success("تم تسجيل الإنجاز الإضافي (تحفيز فقط)");
      }

      setReflection("");
      setShowCompletionModal(false);
      setPendingSubmissionData(null);
      setNextBookIdForRollover("");
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      await queryClient.invalidateQueries({ queryKey: WEEKLY_LOG_STATUS_KEY });
      await queryClient.invalidateQueries({ queryKey: STUDENT_ANALYTICS_ME_KEY });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "حدث خطأ أثناء الرصد";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildPrimaryRow = (): LogRow | null => {
    if (!bookId || !selectedBook) return null;
    if (startPage > endPage) return null;
    return normalizeRow(selectedBook, startPage, endPage);
  };

  const openMultiBookDialog = (rows: LogRow[], remainingQuota: number) => {
    setPendingSubmissionData({
      rows,
      reflection: reflection.trim() || undefined,
      remainingPages: remainingQuota,
    });
    setShowCompletionModal(true);
    setNextBookIdForRollover("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const row = buildPrimaryRow();
    if (!row || !selectedBook) {
      toast.error("تحقق من الكتاب والصفحات");
      return;
    }
    if (startPage > endPage) {
      toast.error("صفحة النهاية يجب أن تكون أكبر من صفحة البداية");
      return;
    }

    const lastPage = lastPageForBook(selectedBook);
    const { needed, remainingQuota } = needsMultiBookContinuation(
      row,
      selectedBook,
      lastPage,
      weeklyQuota
    );

    if (needed) {
      const others = booksAvailableForRollover(availableBooks, new Set([row.bookId]));
      if (others.length === 0) {
        toast.warning(
          `متبقي ${remainingQuota} صفحة من النصاب ولا توجد كتب أخرى في المرحلة — سيتم حفظ ما قرأته.`
        );
        submitLogs([row], "primary", reflection.trim() || undefined);
        return;
      }
      toast.info(`لم تكتمل ${weeklyQuota} صفحة بعد — أكمل من كتاب آخر أو تخطَّ`);
      openMultiBookDialog([row], remainingQuota);
      return;
    }

    submitLogs([row], "primary", reflection.trim() || undefined);
  };

  const handleExtraSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const row = buildPrimaryRow();
    if (!row) {
      toast.error("تحقق من الكتاب والصفحات");
      return;
    }
    submitLogs([row], "extra", reflection.trim() || undefined);
  };

  const confirmRolloverSubmit = (withRollover: boolean) => {
    if (!pendingSubmissionData) return;

    if (!withRollover) {
      submitLogs(pendingSubmissionData.rows, "primary", pendingSubmissionData.reflection);
      return;
    }

    if (!nextBookIdForRollover) {
      toast.error("اختر الكتاب التالي");
      return;
    }

    const nextBook = availableBooks.find((b) => b.id.toString() === nextBookIdForRollover);
    if (!nextBook) {
      toast.error("الكتاب غير متاح");
      return;
    }

    const rows = [...pendingSubmissionData.rows];
    const nextRow = buildRolloverRow(
      nextBook,
      pendingSubmissionData.remainingPages,
      lastPageForBook(nextBook)
    );
    rows.push(nextRow);

    const stillRemaining = quotaRemainingAfter(rows, weeklyQuota);
    const usedIds = new Set(rows.map((r) => r.bookId));
    const moreBooks = booksAvailableForRollover(availableBooks, usedIds);

    if (
      stillRemaining > 0 &&
      consumedAllAvailableInBook(nextBook, nextRow, lastPageForBook(nextBook)) &&
      moreBooks.length > 0
    ) {
      toast.info(`متبقي ${stillRemaining} صفحة من النصاب — اختر كتاباً آخر أو تخطَّ`);
      setPendingSubmissionData({
        rows,
        reflection: pendingSubmissionData.reflection,
        remainingPages: stillRemaining,
      });
      setNextBookIdForRollover("");
      return;
    }

    submitLogs(rows, "primary", pendingSubmissionData.reflection);
  };

  const rolloverBookOptions = useMemo(() => {
    if (!pendingSubmissionData) return [];
    const used = new Set(pendingSubmissionData.rows.map((r) => r.bookId));
    return booksAvailableForRollover(availableBooks, used);
  }, [pendingSubmissionData, availableBooks]);

  const rolloverPreview = useMemo(() => {
    if (!pendingSubmissionData || !nextBookIdForRollover) return null;
    const nextBook = availableBooks.find((b) => b.id.toString() === nextBookIdForRollover);
    if (!nextBook) return null;
    return buildRolloverRow(
      nextBook,
      pendingSubmissionData.remainingPages,
      lastPageForBook(nextBook)
    );
  }, [pendingSubmissionData, nextBookIdForRollover, availableBooks, user?.currentBookId, user?.lastPage]);

  const submitCustomProgress = async () => {
    setIsSubmittingCustom(true);
    try {
      const response = await fetch("/api/users.php?id=custom_progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          completedBooks: selectedCustomBooks,
          newCurrentBookId: selectedCustomBooks[0] ?? null,
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || "فشل في تحديث البيانات");
      }
      toast.success("تم اعتماد الكتب السابقة بنجاح!");
      setShowCustomProgress(false);
      setSelectedCustomBooks([]);
      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      await queryClient.invalidateQueries({ queryKey: STUDENT_ANALYTICS_ME_KEY });
      await queryClient.refetchQueries({ queryKey: STUDENT_ANALYTICS_ME_KEY });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "حدث خطأ";
      toast.error(message);
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const bannerBase =
    "flex gap-2 items-start p-[var(--sp-4)] rounded-[var(--radius-lg)] border border-[var(--border-subtle)]";
  const warningText = "text-[var(--secondary-400)]";
  const successText = "text-[var(--success-600)]";
  const muted = "text-[var(--text-secondary)]";

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
        <div>
          <h2 className="text-[var(--font-lg)] font-bold">
            مرحباً، <span className={warningText}>{user?.name}</span>
          </h2>
          {!isExtraMode && (
            <p className={`text-[var(--font-xs)] mt-0.5 ${muted}`}>
              النصاب الأسبوعي:{" "}
              <strong className="text-[var(--text-primary)]">{weeklyQuota} صفحة</strong>
            </p>
          )}
        </div>

        <Card className={STUDENT_SURFACE_CARD}>
          {logCardMode === "submitted" ? (
            <CardContent className="pt-10 pb-10 space-y-5 text-center">
              <CheckCircle className="w-14 h-14 mx-auto text-[var(--success-600)]" />
              <div>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  شكراً لك! تم تسليم رصدك الأسبوعي بنجاح
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md mx-auto leading-relaxed">
                  الإنجاز الإضافي يزيد صفحاتك (تحفيز) فقط ولا يغيّر تقييمك الأسبوعي المغلق.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full max-w-xs mx-auto h-11 rounded-[var(--radius-lg)]"
                onClick={() => {
                  setPagesManuallyEdited(false);
                  setIsExtraMode(true);
                }}
              >
                إرسال إنجاز إضافي
              </Button>
            </CardContent>
          ) : logCardMode === "off-day" ? (
            <CardContent className="pt-10 pb-10 space-y-5 text-center">
              <Calendar className="w-14 h-14 mx-auto text-[var(--secondary-400)]" />
              <div>
                <p className="text-lg font-bold text-[var(--text-primary)]">
                  اليوم ليس موعد الرصد الأسبوعي
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md mx-auto leading-relaxed">
                  موعد الرصد: <strong>{submissionWindow.primaryDayLabelAr}</strong>، ويوم التأخير:{" "}
                  <strong>{submissionWindow.lateDayLabelAr}</strong>. اليوم:{" "}
                  <strong>{submissionWindow.todayLabelAr}</strong>. يمكنك إرسال إنجاز إضافي (تحفيز)
                  دون أن يُحسب رصداً أسبوعياً.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-full max-w-xs mx-auto h-11 rounded-[var(--radius-lg)]"
                onClick={() => {
                  setPagesManuallyEdited(false);
                  setIsExtraMode(true);
                }}
              >
                إرسال إنجاز إضافي
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b border-[var(--border-subtle)]">
                <CardTitle className="text-[var(--font-lg)] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[var(--primary-600)]" />
                    {isExtraMode ? "إنجاز إضافي (تحفيز)" : "الرصد الأسبوعي"}
                  </div>
                  {isExtraMode && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPagesManuallyEdited(false);
                        setIsExtraMode(false);
                      }}
                    >
                      رجوع
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-5">
                {isExtraMode && (
                  <div className={`${bannerBase} bg-[var(--bg-tertiary)] mb-4`}>
                    <Info className="w-4 h-4 text-[var(--secondary-400)] shrink-0 mt-0.5" />
                    <span className="text-sm text-[var(--text-secondary)]">
                      إنجاز إضافي (تحفيز) — لا يرتبط بالنصاب الأسبوعي ولا يعدّل تقييم الرصد
                      الرسمي.
                    </span>
                  </div>
                )}

                {!isExtraMode && submissionWindow.kind === "official" && (
                  <div className={`${bannerBase} bg-[var(--bg-primary)] border-[var(--primary-600)] mb-4`}>
                    <Calendar className="w-4 h-4 text-[var(--primary-600)] shrink-0" />
                    <span className="text-sm text-[var(--text-primary)]">
                      اليوم هو <strong>يوم الرصد الرسمي</strong> — النموذج مفتوح لإتمام نصابك (
                      {weeklyQuota} صفحة).
                    </span>
                  </div>
                )}

                {!isExtraMode && submissionWindow.kind === "late" && (
                  <div className={`${bannerBase} bg-[var(--bg-tertiary)] mb-4`}>
                    <Calendar className="w-4 h-4 text-[var(--secondary-400)] shrink-0" />
                    <span className="text-sm text-[var(--text-secondary)]">
                      اليوم <strong>يوم التأخير</strong> — يمكنك إتمام رصدك الأسبوعي.
                    </span>
                  </div>
                )}

                {!isExtraMode && submissionWindow.kind === "anytime" && (
                  <div className={`${bannerBase} bg-[var(--bg-tertiary)] mb-4`}>
                    <Info className="w-4 h-4 text-[var(--secondary-400)] shrink-0 mt-0.5" />
                    <span className="text-sm text-[var(--text-secondary)]">
                      الرصد مفعّل طوال أيام الأسبوع.
                    </span>
                  </div>
                )}

                {!isExtraMode &&
                  currentBook &&
                  remainingInCurrentBook < weeklyQuota &&
                  remainingInCurrentBook > 0 && (
                    <div className={`${bannerBase} bg-[var(--bg-tertiary)] mb-4`}>
                      <Lightbulb className="w-4 h-4 text-[var(--secondary-400)] shrink-0 mt-0.5" />
                      <span className="text-[var(--text-secondary)]">
                        متبقي <strong>{remainingInCurrentBook}</strong> صفحة في "{currentBook.title}".
                      </span>
                    </div>
                  )}

                {!isExtraMode &&
                  currentBook &&
                  remainingInCurrentBook === 0 &&
                  nextBook && (
                    <div className={`${bannerBase} bg-[var(--bg-primary)] border-[var(--success-600)] mb-4`}>
                      <CheckCircle className="w-4 h-4 text-[var(--success-600)] shrink-0" />
                      <span className={successText}>
                        أنهيت "{currentBook.title}"! انتقل إلى "{nextBook.title}".
                      </span>
                    </div>
                  )}

                <form
                  onSubmit={isExtraMode ? handleExtraSubmit : handleSubmit}
                  className="space-y-5"
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center mb-1">
                      <Label>الكتاب</Label>
                      <span className="text-[var(--font-xs)] text-[var(--text-secondary)]">
                        مرحلة {viewPhase}
                      </span>
                    </div>
                    <Select
                      value={bookId}
                      onValueChange={(value) => {
                        setPagesManuallyEdited(false);
                        setBookId(value);
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="اختر الكتاب" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBooks.map((book) => (
                          <SelectItem key={book.id} value={book.id.toString()}>
                            {book.title} ({book.totalPages} ص)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedBook &&
                    parseInt(bookId, 10) === currentBook?.id &&
                    effectiveLastPage > 0 && (
                      <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] border">
                        <Progress
                          value={(effectiveLastPage / selectedBook.totalPages) * 100}
                          className="h-1.5"
                        />
                        <p className="text-xs mt-2 text-[var(--text-secondary)]">
                          {effectiveLastPage} / {selectedBook.totalPages} — متبقي {remainingInCurrentBook}
                        </p>
                      </div>
                    )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>من صفحة</Label>
                      <Input
                        type="number"
                        min={1}
                        value={startPage}
                        onChange={(e) => {
                          setPagesManuallyEdited(true);
                          setStartPage(Math.max(1, parseInt(e.target.value, 10) || 1));
                        }}
                        className="h-11 text-center"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>إلى صفحة</Label>
                      <Input
                        type="number"
                        min={startPage}
                        max={selectedBook?.totalPages}
                        value={endPage}
                        onChange={(e) => {
                          setPagesManuallyEdited(true);
                          setEndPage(parseInt(e.target.value, 10) || startPage);
                        }}
                        className="h-11 text-center"
                        required
                      />
                    </div>
                  </div>

                  {bookId && !isExtraMode && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">النصاب</span>
                        <span>
                          {pagesCount} / {weeklyQuota}
                        </span>
                      </div>
                      <Progress value={Math.min(100, (pagesCount / weeklyQuota) * 100)} />
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowReflection(!showReflection)}
                  >
                    {showReflection ? "إخفاء الفائدة" : "إضافة فائدة (اختياري)"}
                  </Button>

                  {showReflection && (
                    <div className="space-y-2">
                      <Textarea
                        value={reflection}
                        onChange={(e) => setReflection(e.target.value)}
                        className="min-h-[80px]"
                      />
                      {reflection.trim() && (
                        <Button type="button" variant="secondary" onClick={shareViaWhatsApp}>
                          <Send className="w-4 h-4 ml-2" />
                          واتساب
                        </Button>
                      )}
                    </div>
                  )}

                  <Button type="submit" className="w-full h-11" disabled={isSubmitting || !bookId}>
                    {isSubmitting ? (
                      <Loader2 className="animate-spin" />
                    ) : isExtraMode ? (
                      "إرسال إنجاز إضافي"
                    ) : (
                      "اعتماد الرصد"
                    )}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card className={STUDENT_SURFACE_CARD}>
            <CardContent className="p-4 text-center space-y-2 min-h-[120px] flex flex-col justify-center">
              {isAnalyticsLoading ? (
                <Loader2 className="w-6 h-6 mx-auto animate-spin text-[var(--text-secondary)]" />
              ) : (
                <>
                  <div
                    className="relative mx-auto w-14 h-14 flex items-center justify-center rounded-full border-2 border-[var(--primary-600)]"
                    aria-hidden
                  >
                    <span className="text-sm font-bold text-[var(--primary-600)]">
                      {stageCompletionRate}%
                    </span>
                  </div>
                  <Progress value={stageCompletionRate} className="h-1.5" />
                </>
              )}
              <p className="text-xs text-[var(--text-secondary)]">نسبة الإنجاز المرحلي</p>
              <p className="text-[10px] text-[var(--text-disabled)] leading-tight mt-0.5">
                تقدمك الرسمي حتى هذا الأسبوع
              </p>
            </CardContent>
          </Card>

          <Card className={STUDENT_SURFACE_CARD}>
            <CardContent className="p-4 text-center min-h-[120px] flex flex-col justify-center">
              {isAnalyticsLoading ? (
                <Loader2 className="w-6 h-6 mx-auto animate-spin text-[var(--text-secondary)]" />
              ) : (
                <>
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-[var(--secondary-400)]" />
                  <p className="text-xl font-bold">{gamificationPages}</p>
                </>
              )}
              <p className="text-xs text-[var(--text-secondary)] mt-1">حصيلة التحفيز</p>
              <p className="text-[10px] text-[var(--text-disabled)] leading-tight">
                إجمالي الصفحات المسجّلة في رصدك
              </p>
            </CardContent>
          </Card>

          <Card className={STUDENT_SURFACE_CARD}>
            <CardContent className="p-4 text-center min-h-[120px] flex flex-col justify-center">
              {isAnalyticsLoading ? (
                <Loader2 className="w-6 h-6 mx-auto animate-spin text-[var(--text-secondary)]" />
              ) : (
                <>
                  <Calendar className="w-4 h-4 mx-auto mb-1 text-[var(--secondary-400)] shrink-0" />
                  <p className="text-xs font-medium leading-snug text-[var(--text-primary)] line-clamp-3">
                    {expectedFinishHint}
                  </p>
                </>
              )}
              <p className="text-xs text-[var(--text-secondary)] mt-2">موعد الختم</p>
              <p className="text-[10px] text-[var(--text-disabled)] leading-tight">
                تقدير تحفيزي من وتيرة قراءتك
              </p>
            </CardContent>
          </Card>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-sm">كتب المرحلة</h3>
            <Button variant="outline" size="sm" onClick={() => setShowCustomProgress(true)}>
              إنجاز سابق
            </Button>
          </div>
          <Select value={viewPhase.toString()} onValueChange={(v) => setViewPhase(parseInt(v, 10))}>
            <SelectTrigger className="mb-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {phaseStats.map((ps) => (
                <SelectItem key={ps.phase} value={ps.phase.toString()}>
                  المرحلة {ps.phase} ({ps.percent}%)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="grid gap-3">
            {displayedPhaseBooks.map((book) => {
              const isCompleted = completedBookIds.includes(book.id);
              const isCurrent = user?.currentBookId === book.id;
              return (
                <div
                  key={book.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border-2 transition-colors bg-[var(--bg-primary)] shadow-sm",
                    isCompleted
                      ? "border-[var(--success-600)] bg-[hsl(var(--success)/0.08)]"
                      : isCurrent
                        ? "border-[hsl(var(--primary))]"
                        : "border-[var(--border-strong)]"
                  )}
                >
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{book.title}</span>
                      {isCompleted && <span className={COMPLETED_BADGE_CLASS}>مكتمل</span>}
                      {isCurrent && !isCompleted && <Badge variant="outline">حالي</Badge>}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {book.bookCode} · {book.totalPages} ص
                    </p>
                  </div>
                  {book.pdfUrl && (
                    <a href={book.pdfUrl} target="_blank" rel="noreferrer">
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <Dialog open={showCustomProgress} onOpenChange={setShowCustomProgress}>
          <DialogContent className="border-2 border-[var(--border-strong)]">
            <DialogHeader>
              <DialogTitle>إنجاز سابق</DialogTitle>
            </DialogHeader>
            <div className="max-h-[40vh] overflow-y-auto space-y-2">
              {trackBooks
                .filter((b) => !completedBookIds.includes(b.id))
                .map((book) => {
                  const isSelected = selectedCustomBooks.includes(book.id);
                  return (
                    <div
                      key={book.id}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "p-3 rounded-lg cursor-pointer border-2 flex items-center justify-between gap-2 transition-all",
                        isSelected
                          ? "border-[hsl(var(--primary))] bg-[var(--bg-tertiary)] ring-2 ring-[hsl(var(--primary))]/25"
                          : "border-[var(--border-strong)] bg-[var(--bg-primary)] hover:border-[var(--border-default)]"
                      )}
                      onClick={() =>
                        setSelectedCustomBooks((prev) =>
                          prev.includes(book.id)
                            ? prev.filter((id) => id !== book.id)
                            : [...prev, book.id]
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedCustomBooks((prev) =>
                            prev.includes(book.id)
                              ? prev.filter((id) => id !== book.id)
                              : [...prev, book.id]
                          );
                        }
                      }}
                    >
                      <span className="font-medium text-sm">{book.title}</span>
                      {isSelected && (
                        <Check className="w-5 h-5 shrink-0 text-[hsl(var(--primary))]" />
                      )}
                    </div>
                  );
                })}
            </div>
            <Button
              className="w-full mt-4"
              disabled={!selectedCustomBooks.length || isSubmittingCustom}
              onClick={submitCustomProgress}
            >
              اعتماد ({selectedCustomBooks.length})
            </Button>
          </DialogContent>
        </Dialog>

        <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>أكمل النصاب الأسبوعي</DialogTitle>
            </DialogHeader>
            {pendingSubmissionData && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--text-secondary)]">
                  قرأت <strong>{sumPages(pendingSubmissionData.rows)}</strong> من{" "}
                  <strong>{weeklyQuota}</strong> صفحة. متبقي{" "}
                  <strong>{pendingSubmissionData.remainingPages}</strong> صفحة لإكمال النصاب.
                </p>
                {pendingSubmissionData.rows.length > 0 && (
                  <ul className="text-xs text-[var(--text-secondary)] space-y-1 border rounded-lg p-3 bg-[var(--bg-tertiary)]">
                    {pendingSubmissionData.rows.map((r, i) => {
                      const title =
                        trackBooks.find((b) => b.id === r.bookId)?.title ?? `كتاب ${r.bookId}`;
                      return (
                        <li key={`${r.bookId}-${i}`}>
                          {title}: ص {r.startPage}–{r.endPage} ({pagesInRow(r)} ص)
                        </li>
                      );
                    })}
                  </ul>
                )}
                <Select value={nextBookIdForRollover} onValueChange={setNextBookIdForRollover}>
                  <SelectTrigger>
                    <SelectValue placeholder="الكتاب التالي في المرحلة" />
                  </SelectTrigger>
                  <SelectContent>
                    {rolloverBookOptions.map((book) => (
                      <SelectItem key={book.id} value={book.id.toString()}>
                        {book.title} ({book.totalPages} ص)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {rolloverPreview && (
                  <p className="text-xs text-[var(--text-primary)] bg-[var(--bg-tertiary)] p-2 rounded-md">
                    سيُحقَن: من صفحة <strong>{rolloverPreview.startPage}</strong> إلى{" "}
                    <strong>{rolloverPreview.endPage}</strong> (
                    {pagesInRow(rolloverPreview)} صفحة)
                  </p>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={isSubmitting}
                    onClick={() => confirmRolloverSubmit(false)}
                  >
                    تخطي / إنهاء الرصد
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!nextBookIdForRollover || isSubmitting}
                    onClick={() => confirmRolloverSubmit(true)}
                  >
                    متابعة
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  );
}
