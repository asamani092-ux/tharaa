import { useState, useEffect, useMemo } from "react";
import {
  useGetMe,
  useListCurriculum,
  useGetMyLogs,
  useCreateLog,
  useGetSettings,
} from "@workspace/api-client-react";
import { getGetMeQueryKey, getGetMyLogsQueryKey } from "@workspace/api-client-react";
import { StudentLayout } from "@/components/layout";
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
  ChevronLeft,
  Info,
  Lightbulb,
  Send,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const WEEKLY_QUOTA = 75;

export default function StudentPortal() {
  const queryClient = useQueryClient();
  const { data: session } = useGetMe();
  const user = session?.user;

  const { data: settings } = useGetSettings();
  const weeklyQuota = settings?.weeklyQuota || WEEKLY_QUOTA;

  const { data: books } = useListCurriculum();
  const { data: logs } = useGetMyLogs();
  const createLog = useCreateLog();

  const completedBookIds: number[] = user?.completedBooks ?? [];
  const completedBookIdSet = useMemo(() => new Set<number>(completedBookIds), [completedBookIds]);

  // O(B) (بدل السابق O(U*B)): تجميع إجمالي كل مرحلة + عدد المكتمل منها
  const phaseStats = useMemo(() => {
    const totalsByPhase = new Map<number, { total: number; completed: number }>();

    for (const b of books ?? []) {
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
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { phase, percent };
    });
  }, [books, completedBookIdSet]);

  // حالات الواجهة
  const [viewPhase, setViewPhase] = useState<number>(1);
  const [bookId, setBookId] = useState<string>("");
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(weeklyQuota);
  const [reflection, setReflection] = useState("");
  const [showReflection, setShowReflection] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [nextBookIdForRollover, setNextBookIdForRollover] = useState<string>("");
  const [pendingSubmissionData, setPendingSubmissionData] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // حالات نافذة الإنجاز السابق
  const [showCustomProgress, setShowCustomProgress] = useState(false);
  const [selectedCustomBooks, setSelectedCustomBooks] = useState<number[]>([]);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState(false);

  // تعيين المرحلة المعروضة عند تحميل الصفحة
  useEffect(() => {
    if (user?.phaseNumber) setViewPhase(user.phaseNumber);
  }, [user?.phaseNumber]);

  // الكتب المعروضة في المرحلة المحددة حالياً من القائمة
  const displayedPhaseBooks = books?.filter((b) => b.phaseNumber === viewPhase) || [];
  const availableBooks = displayedPhaseBooks.filter((b) => !completedBookIds.includes(b.id));

  // تحديد الكتاب الحالي
  const userCurrentBook = user?.currentBookId ? books?.find((b) => b.id === user.currentBookId) : null;
  const isCurrentBookValid =
    userCurrentBook &&
    !completedBookIds.includes(userCurrentBook.id) &&
    userCurrentBook.phaseNumber === viewPhase;

  const currentBook = isCurrentBookValid ? userCurrentBook : availableBooks[0];

  const effectiveLastPage = isCurrentBookValid ? user?.lastPage || 0 : 0;
  const remainingInCurrentBook = currentBook ? Math.max(0, currentBook.totalPages - effectiveLastPage) : 0;
  const suggestedEndPage = currentBook
    ? effectiveLastPage + Math.min(remainingInCurrentBook, weeklyQuota)
    : weeklyQuota;

  // تحديث الحقول عند تغيير المرحلة أو الكتاب
  useEffect(() => {
    if (currentBook) {
      setBookId(currentBook.id.toString());
      setStartPage(effectiveLastPage + 1);
      setEndPage(suggestedEndPage);
    } else {
      setBookId("");
      setStartPage(1);
      setEndPage(weeklyQuota);
    }
  }, [currentBook?.id, effectiveLastPage, suggestedEndPage, viewPhase, weeklyQuota]);

  useEffect(() => {
    const selectedId = parseInt(bookId);
    if (selectedId === currentBook?.id) {
      setStartPage(effectiveLastPage + 1);
      setEndPage(suggestedEndPage);
    } else if (bookId) {
      setStartPage(1);
      setEndPage(weeklyQuota);
    }
  }, [bookId, currentBook?.id, effectiveLastPage, suggestedEndPage, weeklyQuota]);

  const selectedBook = displayedPhaseBooks.find((b) => b.id.toString() === bookId);
  const pagesCount = Math.max(0, endPage - startPage + 1);
  const isOverQuota = pagesCount > weeklyQuota;
  const isWillFinishBook = selectedBook ? endPage >= selectedBook.totalPages : false;

  // حساب دقيق وشامل للصفحات
  const completedPages =
    books?.filter((b) => completedBookIds.includes(b.id)).reduce((sum, b) => sum + b.totalPages, 0) || 0;

  const activeBookPages =
    userCurrentBook && !completedBookIds.includes(userCurrentBook.id) ? user?.lastPage || 0 : 0;

  const calculatedTotalPages = completedPages + activeBookPages;
  const loggedPages = logs?.reduce((sum, log) => sum + log.pagesRead, 0) || 0;
  const totalPagesRead = Math.max(calculatedTotalPages, loggedPages);

  // رسالة الواتساب
  const shareViaWhatsApp = () => {
    if (!reflection.trim() || !selectedBook) {
      toast.error("أكتب فائدة لكي تتمكن من المشاركة");
      return;
    }
    const message = `📚 *فائدة من كتاب: ${selectedBook.title}*\n\n"${reflection.trim()}"\n\n✨ تمت المشاركة عبر منصة ثراء المعرفة`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const nextBook = availableBooks.find((b) => b.id !== currentBook?.id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookId) return;

    if (startPage > endPage) {
      toast.error("صفحة النهاية يجب أن تكون أكبر من صفحة البداية");
      return;
    }

    const actualEndPage = Math.min(endPage, selectedBook?.totalPages || endPage);
    const isBookCompleted = actualEndPage >= (selectedBook?.totalPages || 0);

    const remainingPages =
      isBookCompleted && selectedBook
        ? Math.max(0, weeklyQuota - (actualEndPage - startPage + 1))
        : 0;

    if (isBookCompleted && remainingPages > 0 && availableBooks.length > 1) {
      setPendingSubmissionData({
        bookId: parseInt(bookId),
        startPage,
        endPage: actualEndPage,
        isCompleted: true,
        reflection: reflection.trim() || undefined,
        remainingPages,
      });
      setShowCompletionModal(true);
      setNextBookIdForRollover("");
      return;
    }

    submitLog({
      bookId: parseInt(bookId),
      startPage,
      endPage: actualEndPage,
      isCompleted: isBookCompleted,
      reflection: reflection.trim() || undefined,
    });
  };

  const submitLog = async (data: any, rolloverPages: number = 0) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await createLog.mutateAsync({ data });
      toast.success("تم تسجيل النصاب بنجاح 🎉");
      setReflection("");
      setShowCompletionModal(false);
      setPendingSubmissionData(null);

      if (rolloverPages > 0 && nextBookIdForRollover) {
        const nextSelectedBook = availableBooks.find((b) => b.id.toString() === nextBookIdForRollover);
        if (nextSelectedBook) {
          const actualRolloverEndPage = Math.min(rolloverPages, nextSelectedBook.totalPages);
          const isRolloverCompleted = actualRolloverEndPage >= nextSelectedBook.totalPages;

          await createLog.mutateAsync({
            data: {
              bookId: parseInt(nextBookIdForRollover),
              startPage: 1,
              endPage: actualRolloverEndPage,
              isCompleted: isRolloverCompleted,
              reflection: undefined,
            },
          });

          toast.success(`تم ترحيل ${actualRolloverEndPage} صفحة إلى كتاب "${nextSelectedBook.title}"`);
        }
      }

      await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetMyLogsQueryKey() });
      setNextBookIdForRollover("");
    } catch (err: any) {
      toast.error(err?.error || "حدث خطأ أثناء الرصد");
    } finally {
      setIsSubmitting(false);
    }
  };

  // دالة حفظ الإنجاز السابق
  const submitCustomProgress = async () => {
    setIsSubmittingCustom(true);
    try {
      const response = await fetch("/api/custom_progress.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ book_ids: selectedCustomBooks }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || "فشل في تحديث البيانات");
      }

      toast.success("تم اعتماد الكتب السابقة بنجاح!");
      setShowCustomProgress(false);
      setSelectedCustomBooks([]);
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    } catch (error: any) {
      toast.error(error.message || "حدث خطأ أثناء حفظ الإنجاز السابق");
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
        {/* Greeting */}
        <div>
          <h2 className="text-[var(--font-lg)] font-bold">
            مرحباً، <span className={warningText}>{user?.name}</span>
          </h2>
          <p className={`text-[var(--font-xs)] mt-0.5 ${muted}`}>
            النصاب الأسبوعي المطلوب:{" "}
            <strong className="text-[var(--text-primary)]">{weeklyQuota} صفحة</strong>
          </p>
        </div>

        {/* SUBMISSION FORM CARD */}
        <Card className="rounded-[var(--radius-xl)] border border-[var(--border-default)] shadow-[var(--shadow-md)]">
          <CardHeader className="border-b border-[var(--border-subtle)]">
            <CardTitle className="text-[var(--font-lg)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[var(--primary-600)]" />
                الرصد الأسبوعي
              </div>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-5">
            {currentBook && remainingInCurrentBook < weeklyQuota && remainingInCurrentBook > 0 && (
              <div className={`${bannerBase} bg-[var(--bg-tertiary)]`}>
                <Lightbulb className="w-4 h-4 text-[var(--secondary-400)] shrink-0 mt-0.5" />
                <span className="text-[var(--text-secondary)]">
                  متبقي لك <strong className="text-[var(--text-primary)]">{remainingInCurrentBook}</strong> صفحة في{" "}
                  "{currentBook.title}"، يُقترح إنهاؤها ثم الانتقال إلى{" "}
                  {nextBook ? `"${nextBook.title}"` : "الكتاب التالي"} لإتمام النصاب.
                </span>
              </div>
            )}

            {currentBook && remainingInCurrentBook === 0 && nextBook && (
              <div className={`${bannerBase} bg-[var(--bg-primary)] border-[var(--success-600)]`}>
                <CheckCircle className="w-4 h-4 text-[var(--success-600)] shrink-0 mt-0.5" />
                <span className={successText}>
                  أنهيت "{currentBook.title}"! يُقترح الانتقال إلى "{nextBook.title}".
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-[var(--font-sm)] text-[var(--text-secondary)]">
                    الكتاب المراد قراءته
                  </Label>
                  <span className="text-[var(--font-xs)] px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
                    يعرض كتب المرحلة {viewPhase}
                  </span>
                </div>

                <Select value={bookId} onValueChange={setBookId}>
                  <SelectTrigger className="rounded-[var(--radius-lg)] h-11 bg-transparent border border-[var(--border-default)]">
                    <SelectValue placeholder="اختر الكتاب" />
                  </SelectTrigger>

                  <SelectContent>
                    {availableBooks.map((book) => (
                      <SelectItem key={book.id} value={book.id.toString()}>
                        <span className="flex items-center gap-2">
                          {book.id === currentBook?.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary-400)] inline-block" />
                          )}
                          {book.title}{" "}
                          <span className="text-[var(--text-secondary)] text-[var(--font-xs)]">
                            ({book.totalPages} صفحة)
                          </span>
                        </span>
                      </SelectItem>
                    ))}

                    {availableBooks.length === 0 && (
                      <div className="p-2 text-[var(--font-sm)] text-center text-[var(--text-secondary)]">
                        لقد ختمت جميع كتب هذه المرحلة
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedBook && parseInt(bookId) === currentBook?.id && effectiveLastPage > 0 && (
                <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-[var(--font-sm)]">
                  <div className="flex justify-between mb-2 text-[var(--font-xs)] text-[var(--text-secondary)]">
                    <span>تقدمك في الكتاب</span>
                    <span>
                      {effectiveLastPage} / {selectedBook.totalPages} صفحة
                    </span>
                  </div>
                  <Progress value={(effectiveLastPage / selectedBook.totalPages) * 100} className="h-1.5" />
                  <p className="text-[var(--font-xs)] text-[var(--text-secondary)] mt-1.5">
                    متبقي: <strong className="text-[var(--text-primary)]">{remainingInCurrentBook}</strong> صفحة
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[var(--font-sm)] text-[var(--text-secondary)]">من صفحة</Label>
                  <Input
                    type="number"
                    min={1}
                    value={startPage}
                    onChange={(e) => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="rounded-[var(--radius-lg)] h-11 text-center"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[var(--font-sm)] text-[var(--text-secondary)]">إلى صفحة</Label>
                  <Input
                    type="number"
                    min={startPage}
                    max={selectedBook?.totalPages || undefined}
                    value={endPage}
                    onChange={(e) => setEndPage(parseInt(e.target.value) || startPage)}
                    required
                    className="rounded-[var(--radius-lg)] h-11 text-center"
                  />
                </div>
              </div>

              {bookId && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[var(--font-xs)]">
                    <span className="text-[var(--text-secondary)]">النصاب الأسبوعي</span>
                    <span className={isOverQuota ? "text-[var(--secondary-600)] font-medium" : "text-[var(--primary-600)] font-medium"}>
                      {pagesCount} / {weeklyQuota} صفحة
                    </span>
                  </div>

                  <div className="h-2 rounded-full overflow-hidden bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (pagesCount / weeklyQuota) * 100)}%`,
                        backgroundColor: isOverQuota ? "var(--error-600)" : "var(--secondary-600)",
                      }}
                    />
                  </div>

                  {isOverQuota && (
                    <p className="text-[var(--font-xs)] text-[var(--secondary-400)] flex items-center gap-1">
                      <Info className="w-3 h-3" /> قراءة أكثر من {weeklyQuota} صفحة مسموحة لكنها تؤثر على نسبة الالتزام
                    </p>
                  )}

                  {pagesCount > 0 && pagesCount < weeklyQuota && (
                    <p className="text-[var(--font-xs)] text-[var(--text-secondary)] flex items-center gap-1">
                      <Info className="w-3 h-3" /> بقي لك{" "}
                      <strong className="text-[var(--text-primary)]">{weeklyQuota - pagesCount}</strong> صفحة لإتمام النصاب
                    </p>
                  )}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                className="w-full rounded-[var(--radius-lg)]"
                onClick={() => setShowReflection(!showReflection)}
              >
                {showReflection ? "إخفاء الفائدة" : "إضافة فائدة (اختياري)"}
              </Button>

              {showReflection && (
                <div className="space-y-1.5">
                  <Label className="text-[var(--font-sm)] text-[var(--text-secondary)]">
                    فائدة أو تأمل
                  </Label>

                  <Textarea
                    placeholder="شاركنا أبرز ما استفدته من هذه القراءة..."
                    className="min-h-[80px] rounded-[var(--radius-lg)] resize-none"
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                  />

                  {reflection.trim() && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full rounded-[var(--radius-lg)] gap-2"
                      onClick={shareViaWhatsApp}
                    >
                      <Send className="w-4 h-4" />
                      مشاركة عبر واتساب
                    </Button>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 rounded-[var(--radius-lg)]"
                disabled={isSubmitting || !bookId}
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "اعتماد الرصد"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "الصفحات المقروءة",
              value: totalPagesRead,
              icon: TrendingUp,
              iconClass: "text-[var(--primary-600)]",
            },
            {
              label: "الكتب المنجزة",
              value: completedBookIds.length,
              icon: CheckCircle,
              iconClass: "text-[var(--success-600)]",
            },
            {
              label: "آخر صفحة",
              value: effectiveLastPage,
              icon: BookOpen,
              iconClass: "text-[var(--secondary-600)]",
            },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="rounded-[var(--radius-lg)] border border-[var(--border-default)]"
            >
              <CardContent className="p-4 text-center">
                <stat.icon className={`w-4 h-4 mx-auto mb-1.5 ${stat.iconClass}`} />
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-[var(--font-xs)] text-[var(--text-secondary)] mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Phase books */}
        <div>
          <div className="flex justify-between items-center mb-3 gap-3">
            <h3 className="text-[var(--font-sm)] font-bold flex items-center gap-2">
              كتب المرحلة
              <Select value={viewPhase.toString()} onValueChange={(v) => setViewPhase(parseInt(v))}>
                <SelectTrigger className="w-auto px-3 h-8 rounded-[var(--radius-lg)] bg-transparent border border-[var(--border-default)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {phaseStats.map((ps) => (
                    <SelectItem key={ps.phase} value={ps.phase.toString()}>
                      المرحلة {ps.phase} (إنجاز {ps.percent}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </h3>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomProgress(true)}
              className="text-[var(--font-xs)] h-8 rounded-[var(--radius-lg)] border border-[var(--border-default)] text-[var(--primary-600)]"
            >
              <CheckCircle className="w-3 h-3" /> إنجاز سابق
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {displayedPhaseBooks.map((book) => {
              const isCompleted = completedBookIds.includes(book.id);
              const isCurrent = user?.currentBookId === book.id;

              const itemClass =
                "flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border transition-colors " +
                (isCompleted
                  ? "bg-[var(--bg-primary)] border-[var(--success-600)]"
                  : isCurrent
                    ? "bg-[var(--bg-tertiary)] border-[var(--secondary-400)]"
                    : "bg-[var(--bg-primary)] border-[var(--border-default)]");

              const iconBoxClass =
                "w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0 " +
                (isCompleted
                  ? "bg-[var(--success-600)]/10 border border-[var(--success-600)]"
                  : isCurrent
                    ? "bg-[var(--secondary-400)]/10 border border-[var(--secondary-400)]"
                    : "bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]");

              return (
                <div key={book.id} className={itemClass}>
                  <div className={iconBoxClass}>
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-[var(--success-600)]" />
                    ) : isCurrent ? (
                      <BookOpen className="w-4 h-4 text-[var(--secondary-600)]" />
                    ) : (
                      <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm truncate">{book.title}</span>

                      {isCompleted && (
                        <Badge className="bg-[var(--success-600)] text-white text-[var(--font-xs)] rounded-[var(--radius-full)]">
                          مكتمل
                        </Badge>
                      )}

                      {isCurrent && !isCompleted && (
                        <Badge className="bg-[var(--secondary-400)] text-white text-[var(--font-xs)] rounded-[var(--radius-full)]">
                          حالي
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[var(--font-xs)] text-[var(--text-secondary)]">
                      <span>{book.bookCode}</span>
                      <span>{book.totalPages} صفحة</span>
                      <span>{book.levelType === "basic" ? "أساسي" : "اختياري"}</span>
                    </div>

                    {isCurrent && !isCompleted && effectiveLastPage > 0 && (
                      <Progress
                        value={(effectiveLastPage / book.totalPages) * 100}
                        className="h-1 mt-2"
                      />
                    )}
                  </div>

                  {book.pdfUrl && (
                    <a href={book.pdfUrl} target="_blank" rel="noreferrer">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-[var(--radius-md)] shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
              );
            })}

            {displayedPhaseBooks.length === 0 && (
              <div className="py-10 text-center text-[var(--text-secondary)] rounded-[var(--radius-lg)] text-sm border border-[var(--border-default)]">
                لا توجد كتب مسجلة لهذه المرحلة حالياً
              </div>
            )}
          </div>
        </div>

        {/* Custom Progress Modal */}
        <Dialog open={showCustomProgress} onOpenChange={setShowCustomProgress}>
          <DialogContent
            className="sm:max-w-[450px] rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-primary)]"
          >
            <DialogHeader>
              <DialogTitle className="text-lg text-[var(--text-primary)]">
                إضافة إنجاز سابق
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <p className="text-sm text-[var(--text-secondary)]">
                هل قرأت بعض هذه الكتب خارج النظام؟ حددها ليتم اعتمادها كـ "مكتملة" في حسابك:
              </p>

              <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {(books ?? [])
                  .filter((b) => !completedBookIds.includes(b.id))
                  .map((book) => {
                    const selected = selectedCustomBooks.includes(book.id);

                    return (
                      <div
                        key={book.id}
                        onClick={() =>
                          setSelectedCustomBooks((prev) =>
                            prev.includes(book.id)
                              ? prev.filter((id) => id !== book.id)
                              : [...prev, book.id]
                          )
                        }
                        className={[
                          "flex items-center justify-between p-3 rounded-[var(--radius-lg)] cursor-pointer transition-colors border",
                          selected
                            ? "bg-[var(--primary-50)] border-[var(--primary-400)]"
                            : "bg-transparent border-transparent hover:bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]",
                        ].join(" ")}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={[
                              "w-5 h-5 rounded flex items-center justify-center border",
                              selected
                                ? "bg-[var(--secondary-400)] border-[var(--secondary-400)]"
                                : "bg-[var(--bg-tertiary)] border-[var(--border-subtle)]",
                            ].join(" ")}
                          >
                            {selected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <span className="text-sm font-medium">{book.title}</span>
                        </div>

                        <span className="text-[var(--font-xs)] text-[var(--text-secondary)]">
                          المرحلة {book.phaseNumber}
                        </span>
                      </div>
                    );
                  })}
              </div>

              <div className="pt-2">
                <Button
                  className="w-full h-11 rounded-[var(--radius-lg)] font-bold"
                  disabled={isSubmittingCustom || selectedCustomBooks.length === 0}
                  onClick={submitCustomProgress}
                >
                  {isSubmittingCustom ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    `اعتماد (${selectedCustomBooks.length}) كتب`
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Rollover Modal */}
        <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
          <DialogContent
            className="sm:max-w-[500px] rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-primary)]"
          >
            <DialogHeader>
              <DialogTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[var(--success-600)]" />
                تهانينا! أنهيت كتاب "{selectedBook?.title}"
              </DialogTitle>
            </DialogHeader>

            {pendingSubmissionData && (
              <div className="space-y-4 pt-4">
                <div className="p-3 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] text-sm">
                  <p className="text-[var(--font-sm)] text-[var(--text-secondary)] mb-2">
                    متبقي لك{" "}
                    <strong className="text-[var(--secondary-400)]">
                      {pendingSubmissionData.remainingPages}
                    </strong>{" "}
                    صفحة من النصاب الأسبوعي
                  </p>
                  <p className="text-[var(--font-xs)] text-[var(--text-secondary)]">
                    اختر كتاباً من قائمتك لتكمل معه النصاب الأسبوعي
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[var(--font-sm)] text-[var(--text-secondary)]">
                    اختر الكتاب التالي
                  </Label>

                  <Select
                    value={nextBookIdForRollover}
                    onValueChange={setNextBookIdForRollover}
                  >
                    <SelectTrigger className="rounded-[var(--radius-lg)] bg-transparent border border-[var(--border-default)]">
                      <SelectValue placeholder="اختر الكتاب" />
                    </SelectTrigger>

                    <SelectContent>
                      {availableBooks
                        .filter((b) => b.id !== parseInt(bookId))
                        .map((book) => (
                          <SelectItem key={book.id} value={book.id.toString()}>
                            {book.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 rounded-[var(--radius-lg)]"
                    disabled={isSubmitting}
                    onClick={() => {
                      setShowCompletionModal(false);
                      submitLog(pendingSubmissionData);
                    }}
                  >
                    تخطي
                  </Button>

                  <Button
                    type="button"
                    className="flex-1 rounded-[var(--radius-lg)]"
                    disabled={!nextBookIdForRollover || isSubmitting}
                    onClick={() => {
                      submitLog(pendingSubmissionData, pendingSubmissionData.remainingPages);
                    }}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "نعم، ابدأ الكتاب الجديد"
                    )}
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
