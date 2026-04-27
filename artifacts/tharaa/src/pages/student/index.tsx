import { useState, useEffect } from "react";
import { useGetMe, useListCurriculum, useGetMyLogs, useCreateLog, useGetSettings } from "@workspace/api-client-react";
import { getGetMeQueryKey, getGetMyLogsQueryKey } from "@workspace/api-client-react";
import { StudentLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, BookOpen, CheckCircle, TrendingUp, Download, ChevronLeft, Info, Lightbulb, Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const cardStyle = { backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' };
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
  
  // استخراج المراحل المتاحة ديناميكياً مع حساب نسبة الإنجاز لكل مرحلة
  const uniquePhases = Array.from(new Set(books?.map(b => b.phaseNumber) || [1])).sort((a, b) => a - b);
  const phaseStats = uniquePhases.map(phase => {
    const phaseBooks = books?.filter(b => b.phaseNumber === phase) || [];
    const completed = phaseBooks.filter(b => completedBookIds.includes(b.id)).length;
    const percent = phaseBooks.length > 0 ? Math.round((completed / phaseBooks.length) * 100) : 0;
    return { phase, percent };
  });
  
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
  const displayedPhaseBooks = books?.filter(b => b.phaseNumber === viewPhase) || [];
  const availableBooks = displayedPhaseBooks.filter(b => !completedBookIds.includes(b.id));

  // تحديد الكتاب الحالي (يجب أن يكون في نفس المرحلة المعروضة لكي تظهر أرقام الصفحات، وإلا نعتبره كتاباً جديداً)
  const userCurrentBook = user?.currentBookId ? books?.find(b => b.id === user.currentBookId) : null;
  const isCurrentBookValid = userCurrentBook && !completedBookIds.includes(userCurrentBook.id) && userCurrentBook.phaseNumber === viewPhase;
  const currentBook = isCurrentBookValid ? userCurrentBook : availableBooks[0];

  const effectiveLastPage = isCurrentBookValid ? (user?.lastPage || 0) : 0;

  const remainingInCurrentBook = currentBook
    ? Math.max(0, currentBook.totalPages - effectiveLastPage) : 0;

  const suggestedEndPage = currentBook
    ? effectiveLastPage + Math.min(remainingInCurrentBook, weeklyQuota) : weeklyQuota;

  const nextBook = availableBooks.find(b => b.id !== currentBook?.id);

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
  }, [currentBook?.id, effectiveLastPage, suggestedEndPage, viewPhase]);

  useEffect(() => {
    const selectedId = parseInt(bookId);
    if (selectedId === currentBook?.id) {
      setStartPage(effectiveLastPage + 1);
      setEndPage(suggestedEndPage);
    } else if (bookId) {
      setStartPage(1);
      setEndPage(weeklyQuota);
    }
  }, [bookId, currentBook?.id, effectiveLastPage, suggestedEndPage]);

  const selectedBook = displayedPhaseBooks.find(b => b.id.toString() === bookId);
  const pagesCount = Math.max(0, endPage - startPage + 1);
  const isOverQuota = pagesCount > weeklyQuota;
  const isWillFinishBook = selectedBook ? endPage >= selectedBook.totalPages : false;

  // حساب دقيق وشامل للصفحات (الكتب المكتملة + الإنجاز في الكتاب الحالي + مقارنة بالسجلات)
  const completedPages = books?.filter(b => completedBookIds.includes(b.id)).reduce((sum, b) => sum + b.totalPages, 0) || 0;
  const activeBookPages = (userCurrentBook && !completedBookIds.includes(userCurrentBook.id)) ? (user?.lastPage || 0) : 0;
  const calculatedTotalPages = completedPages + activeBookPages;
  const loggedPages = logs?.reduce((sum, log) => sum + log.pagesRead, 0) || 0;
  const totalPagesRead = Math.max(calculatedTotalPages, loggedPages); // يأخذ الرقم الأدق دائماً

  const shareViaWhatsApp = () => {
    if (!reflection.trim() || !selectedBook) {
      toast.error("أكتب فائدة لكي تتمكن من المشاركة");
      return;
    }
    const message = `📚 *فائدة من كتاب: ${selectedBook.title}*\n\n"${reflection.trim()}"\n\n✨ تمت المشاركة عبر منصة ثراء المعرفة`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookId) return;
    if (startPage > endPage) {
      toast.error("صفحة النهاية يجب أن تكون أكبر من صفحة البداية");
      return;
    }

    const actualEndPage = Math.min(endPage, selectedBook?.totalPages || endPage);
    const isBookCompleted = actualEndPage >= (selectedBook?.totalPages || 0);
    const remainingPages = isBookCompleted && selectedBook 
      ? Math.max(0, weeklyQuota - (actualEndPage - startPage + 1)) : 0;

    if (isBookCompleted && remainingPages > 0 && availableBooks.length > 1) {
      setPendingSubmissionData({
        bookId: parseInt(bookId),
        startPage,
        endPage: actualEndPage,
        isCompleted: true,
        reflection: reflection.trim() || undefined,
        remainingPages
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
      reflection: reflection.trim() || undefined
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
        const nextSelectedBook = availableBooks.find(b => b.id.toString() === nextBookIdForRollover);
        if (nextSelectedBook) {
          const actualRolloverEndPage = Math.min(rolloverPages, nextSelectedBook.totalPages);
          const isRolloverCompleted = actualRolloverEndPage >= nextSelectedBook.totalPages;

          await createLog.mutateAsync({
            data: {
              bookId: parseInt(nextBookIdForRollover),
              startPage: 1,
              endPage: actualRolloverEndPage,
              isCompleted: isRolloverCompleted,
              reflection: undefined
            }
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
      // التعديل هنا: أضفنا .php للرابط، وأضفنا credentials: 'include'
      const response = await fetch('/api/custom_progress.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // مهم جداً: هذا السطر يرسل بيانات تسجيل الدخول للسيرفر
        body: JSON.stringify({ book_ids: selectedCustomBooks })
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

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6" dir="rtl">

        {/* Greeting */}
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Cairo, sans-serif' }}>
            مرحباً، <span style={{ color: '#D4AF37' }}>{user?.name}</span>
          </h2>
          <p className="text-sm mt-0.5" style={{ color: '#C5A059' }}>
            النصاب الأسبوعي المطلوب: <strong className="text-foreground">{weeklyQuota} صفحة</strong>
          </p>
        </div>

        {/* ═══════════ SUBMISSION FORM CARD ═══════════ */}
        <Card className="rounded-2xl border shadow-lg" style={{ ...cardStyle, borderColor: 'hsl(46,65%,40%,0.4)' }}>
          <CardHeader style={{ borderBottom: '1px solid hsl(217,36%,20%)' }}>
            <CardTitle className="text-lg flex items-center justify-between" style={{ fontFamily: 'Cairo, sans-serif' }}>
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                الرصد الأسبوعي
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">

            {currentBook && remainingInCurrentBook < weeklyQuota && remainingInCurrentBook > 0 && (
              <div className="flex gap-2 p-3 rounded-xl mb-5 text-sm" style={{ backgroundColor: 'hsl(46,65%,8%)', border: '1px solid hsl(46,65%,22%)' }}>
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-amber-200">
                  متبقي لك <strong>{remainingInCurrentBook}</strong> صفحة في "{currentBook.title}"، يُقترح إنهاؤها ثم الانتقال إلى{" "}
                  {nextBook ? `"${nextBook.title}"` : "الكتاب التالي"} لإتمام النصاب.
                </span>
              </div>
            )}

            {currentBook && remainingInCurrentBook === 0 && nextBook && (
              <div className="flex gap-2 p-3 rounded-xl mb-5 text-sm" style={{ backgroundColor: 'hsl(142,40%,7%)', border: '1px solid hsl(142,40%,20%)' }}>
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-emerald-200">
                  أنهيت "{currentBook.title}"! يُقترح الانتقال إلى "{nextBook.title}".
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-sm text-muted-foreground">الكتاب المراد قراءته</Label>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-muted-foreground border border-white/10">
                    يعرض كتب المرحلة {viewPhase}
                  </span>
                </div>
                <Select value={bookId} onValueChange={setBookId}>
                  <SelectTrigger className="rounded-xl h-11" style={{ backgroundColor: 'hsl(217,36%,16%)', border: '1px solid hsl(217,36%,24%)' }}>
                    <SelectValue placeholder="اختر الكتاب" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBooks.map(book => (
                      <SelectItem key={book.id} value={book.id.toString()}>
                        <span className="flex items-center gap-2">
                          {book.id === currentBook?.id && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
                          {book.title} <span className="text-muted-foreground text-xs">({book.totalPages} صفحة)</span>
                        </span>
                      </SelectItem>
                    ))}
                    {availableBooks.length === 0 && (
                      <div className="p-2 text-sm text-center text-muted-foreground">لقد ختمت جميع كتب هذه المرحلة</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedBook && parseInt(bookId) === currentBook?.id && effectiveLastPage > 0 && (
                <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'hsl(218,47%,9%)', border: '1px solid hsl(217,36%,20%)' }}>
                  <div className="flex justify-between mb-2 text-xs text-muted-foreground">
                    <span>تقدمك في الكتاب</span>
                    <span>{effectiveLastPage} / {selectedBook.totalPages} صفحة</span>
                  </div>
                  <Progress value={(effectiveLastPage / selectedBook.totalPages) * 100} className="h-1.5" />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    متبقي: <strong className="text-foreground">{remainingInCurrentBook}</strong> صفحة
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">من صفحة</Label>
                  <Input type="number" min="1" value={startPage} onChange={e => setStartPage(Math.max(1, parseInt(e.target.value) || 1))} required className="rounded-xl h-11 text-center" style={{ backgroundColor: 'hsl(217,36%,16%)', border: '1px solid hsl(217,36%,24%)' }} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">إلى صفحة</Label>
                  <Input type="number" min={startPage} max={selectedBook?.totalPages || ""} value={endPage} onChange={e => setEndPage(parseInt(e.target.value) || startPage)} required className="rounded-xl h-11 text-center" style={{ backgroundColor: 'hsl(217,36%,16%)', border: '1px solid hsl(217,36%,24%)' }} />
                </div>
              </div>

              {bookId && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">النصاب الأسبوعي</span>
                    <span className={isOverQuota ? "text-amber-400 font-medium" : "text-primary font-medium"}>{pagesCount} / {weeklyQuota} صفحة</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'hsl(217,36%,20%)' }}>
                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(100, (pagesCount / weeklyQuota) * 100)}%`, backgroundColor: isOverQuota ? 'hsl(38,92%,50%)' : 'hsl(46,65%,52%)' }} />
                  </div>
                  {isOverQuota && (
                    <p className="text-xs text-amber-400 flex items-center gap-1"><Info className="w-3 h-3" /> قراءة أكثر من {weeklyQuota} صفحة مسموحة لكنها تؤثر على نسبة الالتزام</p>
                  )}
                  {pagesCount > 0 && pagesCount < weeklyQuota && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="w-3 h-3" /> بقي لك <strong className="text-foreground">{weeklyQuota - pagesCount}</strong> صفحة لإتمام النصاب</p>
                  )}
                </div>
              )}

              <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => setShowReflection(!showReflection)}>
                {showReflection ? "إخفاء الفائدة" : "إضافة فائدة (اختياري)"}
              </Button>

              {showReflection && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">فائدة أو تأمل</Label>
                  <Textarea placeholder="شاركنا أبرز ما استفدته من هذه القراءة..." className="min-h-[80px] rounded-xl resize-none" style={{ backgroundColor: 'hsl(217,36%,16%)', border: '1px solid hsl(217,36%,24%)' }} value={reflection} onChange={e => setReflection(e.target.value)} />
                  {reflection.trim() && (
                    <Button type="button" variant="secondary" className="w-full rounded-xl gap-2" onClick={shareViaWhatsApp}><Send className="w-4 h-4" /> مشاركة عبر واتساب</Button>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full h-11 rounded-xl font-bold text-base" disabled={isSubmitting || !bookId}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "اعتماد الرصد"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "الصفحات المقروءة", value: totalPagesRead, icon: TrendingUp, color: "text-primary" },
            { label: "الكتب المنجزة", value: completedBookIds.length, icon: CheckCircle, color: "text-emerald-400" },
            { label: "آخر صفحة", value: effectiveLastPage, icon: BookOpen, color: "text-blue-400" },
          ].map((stat) => (
            <Card key={stat.label} className="rounded-xl border" style={cardStyle}>
              <CardContent className="p-4 text-center">
                <stat.icon className={`w-4 h-4 mx-auto mb-1.5 ${stat.color}`} />
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Phase books (With Phase Navigator) */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-bold flex items-center gap-2" style={{ fontFamily: 'Cairo, sans-serif' }}>
              كتب المرحلة
              <Select value={viewPhase.toString()} onValueChange={(v) => setViewPhase(parseInt(v))}>
                <SelectTrigger className="w-auto px-3 h-8 rounded-lg bg-transparent border-primary/30 text-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {phaseStats.map(ps => (
                    <SelectItem key={ps.phase} value={ps.phase.toString()}>
                      المرحلة {ps.phase} (إنجاز {ps.percent}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </h3>
            <Button variant="outline" size="sm" onClick={() => setShowCustomProgress(true)} className="text-xs h-8 rounded-lg border-primary/30 text-primary hover:bg-primary/10">
              <CheckCircle className="w-3 h-3 ml-1" /> إنجاز سابق
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {displayedPhaseBooks.map((book) => {
              const isCompleted = completedBookIds.includes(book.id);
              const isCurrent = user?.currentBookId === book.id;

              return (
                <div key={book.id} className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: isCompleted ? 'hsl(142,40%,9%)' : 'hsl(218,39%,12%)', border: `1px solid ${isCompleted ? 'hsl(142,40%,22%)' : isCurrent ? 'hsl(46,65%,40%,0.6)' : 'hsl(217,36%,20%)'}` }}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isCompleted ? 'bg-emerald-400/15' : isCurrent ? 'bg-primary/15' : 'bg-white/5'}`}>
                    {isCompleted ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : isCurrent ? <BookOpen className="w-4 h-4 text-primary" /> : <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm truncate">{book.title}</span>
                      {isCompleted && <Badge className="bg-emerald-600/20 text-emerald-400 text-xs shrink-0">مكتمل</Badge>}
                      {isCurrent && !isCompleted && <Badge className="bg-primary/20 text-primary text-xs shrink-0">حالي</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{book.bookCode}</span><span>{book.totalPages} صفحة</span><span>{book.levelType === 'basic' ? 'أساسي' : 'اختياري'}</span>
                    </div>
                    {isCurrent && !isCompleted && effectiveLastPage > 0 && (
                      <Progress value={(effectiveLastPage / book.totalPages) * 100} className="h-1 mt-2" />
                    )}
                  </div>
                  {book.pdfUrl && (
                    <a href={book.pdfUrl} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg shrink-0 text-muted-foreground hover:text-foreground"><Download className="w-3.5 h-3.5" /></Button>
                    </a>
                  )}
                </div>
              );
            })}
            {displayedPhaseBooks.length === 0 && (
              <div className="py-10 text-center text-muted-foreground rounded-xl text-sm" style={{ border: '1px solid hsl(217,36%,20%)' }}>لا توجد كتب مسجلة لهذه المرحلة حالياً</div>
            )}
          </div>
        </div>

        {/* ═══════════ Custom Progress Modal (الإنجاز السابق) ═══════════ */}
        <Dialog open={showCustomProgress} onOpenChange={setShowCustomProgress}>
          <DialogContent className="sm:max-w-[450px] rounded-2xl" style={{ backgroundColor: "hsl(218,39%,12%)", borderColor: "hsl(217,36%,20%)" }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "Cairo, sans-serif" }} className="text-lg">إضافة إنجاز سابق</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">هل قرأت بعض هذه الكتب خارج النظام؟ حددها ليتم اعتمادها كـ "مكتملة" في حسابك:</p>
              <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                {books?.filter(b => !completedBookIds.includes(b.id)).map(book => (
                  <div key={book.id} onClick={() => setSelectedCustomBooks(prev => prev.includes(book.id) ? prev.filter(id => id !== book.id) : [...prev, book.id])} className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors border ${selectedCustomBooks.includes(book.id) ? 'bg-primary/20 border-primary/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedCustomBooks.includes(book.id) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                        {selectedCustomBooks.includes(book.id) && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <span className="text-sm font-medium">{book.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">المرحلة {book.phaseNumber}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <Button className="w-full h-11 rounded-xl font-bold" disabled={isSubmittingCustom || selectedCustomBooks.length === 0} onClick={submitCustomProgress}>
                  {isSubmittingCustom ? <Loader2 className="w-5 h-5 animate-spin" /> : `اعتماد (${selectedCustomBooks.length}) كتب`}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ═══════════ Rollover Modal ═══════════ */}
        <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
          <DialogContent className="sm:max-w-[500px] rounded-2xl" style={{ backgroundColor: "hsl(218,39%,12%)", borderColor: "hsl(217,36%,20%)" }}>
            <DialogHeader>
              <DialogTitle style={{ fontFamily: "Cairo, sans-serif" }} className="text-lg">
                <CheckCircle className="w-5 h-5 inline text-emerald-400 ml-2" />
                تهانينا! أنهيت كتاب "{selectedBook?.title}"
              </DialogTitle>
            </DialogHeader>
            {pendingSubmissionData && (
              <div className="space-y-4 pt-4">
                <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: "hsl(218,47%,9%)" }}>
                  <p className="text-muted-foreground mb-2">متبقي لك <strong className="text-amber-400">{pendingSubmissionData.remainingPages}</strong> صفحة من النصاب الأسبوعي</p>
                  <p className="text-muted-foreground text-xs">اختر كتاباً من قائمتك لتكمل معه النصاب الأسبوعي</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">اختر الكتاب التالي</Label>
                  <Select value={nextBookIdForRollover} onValueChange={setNextBookIdForRollover}>
                    <SelectTrigger className="rounded-xl" style={{ backgroundColor: "hsl(217,36%,16%)", border: "1px solid hsl(217,36%,24%)" }}>
                      <SelectValue placeholder="اختر الكتاب" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBooks.filter(b => b.id !== parseInt(bookId)).map(book => (
                        <SelectItem key={book.id} value={book.id.toString()}>{book.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" className="flex-1 rounded-xl" disabled={isSubmitting} onClick={() => { setShowCompletionModal(false); submitLog(pendingSubmissionData); }}>تخطي</Button>
                  <Button type="button" className="flex-1 rounded-xl" disabled={!nextBookIdForRollover || isSubmitting} onClick={() => { submitLog(pendingSubmissionData, pendingSubmissionData.remainingPages); }}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "نعم، ابدأ الكتاب الجديد"}
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
