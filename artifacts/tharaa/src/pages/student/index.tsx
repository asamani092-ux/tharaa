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
import { toast } from "sonner";
import { Loader2, BookOpen, CheckCircle, TrendingUp, Download, ChevronLeft, Info, Lightbulb } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const cardStyle = { backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' };
const WEEKLY_QUOTA = 75;

export default function StudentPortal() {
  const queryClient = useQueryClient();
  const { data: session } = useGetMe();
  const user = session?.user;

  const { data: settings } = useGetSettings();
  const weeklyQuota = settings?.weeklyQuota || WEEKLY_QUOTA;

  const { data: books } = useListCurriculum({
    query: { enabled: !!user?.phaseNumber }
  });
  const { data: logs } = useGetMyLogs();
  const createLog = useCreateLog();

  const completedBookIds: number[] = user?.completedBooks ?? [];
  const phaseBooks = books?.filter(b => b.phaseNumber === user?.phaseNumber) || [];
  const availableBooks = phaseBooks.filter(b => !completedBookIds.includes(b.id));

  // If currentBook is completed, use first available instead
  const userCurrentBook = user?.currentBookId ? phaseBooks.find(b => b.id === user.currentBookId) : null;
  const currentBook = (userCurrentBook && !completedBookIds.includes(userCurrentBook.id))
    ? userCurrentBook
    : availableBooks[0];

  const remainingInCurrentBook = currentBook
    ? Math.max(0, currentBook.totalPages - (user?.lastPage || 0))
    : 0;

  const suggestedEndPage = currentBook
    ? (user?.lastPage || 0) + Math.min(remainingInCurrentBook, weeklyQuota)
    : weeklyQuota;

  const nextBook = availableBooks.find(b => b.id !== currentBook?.id);

  const [bookId, setBookId] = useState<string>("");
  const [startPage, setStartPage] = useState<number>(1);
  const [endPage, setEndPage] = useState<number>(weeklyQuota);
  const [reflection, setReflection] = useState("");

  useEffect(() => {
    if (currentBook && !bookId) {
      setBookId(currentBook.id.toString());
      setStartPage((user?.lastPage || 0) + 1);
      setEndPage(suggestedEndPage);
    }
  }, [currentBook?.id]);

  useEffect(() => {
    const selectedId = parseInt(bookId);
    if (selectedId === currentBook?.id) {
      setStartPage((user?.lastPage || 0) + 1);
      setEndPage(suggestedEndPage);
    } else {
      setStartPage(1);
      setEndPage(weeklyQuota);
    }
  }, [bookId]);

  const selectedBook = phaseBooks.find(b => b.id.toString() === bookId);
  const pagesCount = Math.max(0, endPage - startPage + 1);
  const isOverQuota = pagesCount > weeklyQuota;
  const isWillFinishBook = selectedBook ? endPage >= selectedBook.totalPages : false;
  const quotaPercent = Math.min(100, (pagesCount / weeklyQuota) * 100);

  const totalPagesRead = logs?.reduce((sum, log) => sum + log.pagesRead, 0) || 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookId) return;
    if (startPage > endPage) {
      toast.error("صفحة النهاية يجب أن تكون أكبر من صفحة البداية");
      return;
    }
    if (pagesCount > 499) {
      toast.error("لا يمكن تسجيل أكثر من 499 صفحة في أسبوع واحد");
      return;
    }
    createLog.mutate(
      {
        data: {
          bookId: parseInt(bookId),
          startPage,
          endPage: Math.min(endPage, selectedBook?.totalPages || endPage),
          isCompleted: isWillFinishBook,
          reflection: reflection.trim() || undefined
        }
      },
      {
        onSuccess: () => {
          toast.success("تم تسجيل النصاب بنجاح 🎉");
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMyLogsQueryKey() });
          setReflection("");
          setBookId("");
        },
        onError: (err: any) => {
          toast.error(err?.error || "حدث خطأ أثناء تسجيل الورد");
        }
      }
    );
  };

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6" dir="rtl">

        {/* Greeting */}
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Cairo, sans-serif' }}>
            مرحباً، {user?.name}
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            المرحلة {user?.phaseNumber} · النصاب الأسبوعي: {weeklyQuota} صفحة
          </p>
        </div>

        {/* ═══════════ SUBMISSION FORM CARD ═══════════ */}
        <Card className="rounded-2xl border shadow-lg" style={{ ...cardStyle, borderColor: 'hsl(46,65%,40%,0.4)' }}>
          <CardHeader style={{ borderBottom: '1px solid hsl(217,36%,20%)' }}>
            <CardTitle className="text-lg flex items-center gap-2" style={{ fontFamily: 'Cairo, sans-serif' }}>
              <BookOpen className="w-5 h-5 text-primary" />
              تسجيل الورد الأسبوعي
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5">

            {/* Smart suggestion banner */}
            {currentBook && remainingInCurrentBook < weeklyQuota && remainingInCurrentBook > 0 && (
              <div className="flex gap-2 p-3 rounded-xl mb-5 text-sm" style={{ backgroundColor: 'hsl(46,65%,8%)', border: '1px solid hsl(46,65%,22%)' }}>
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="text-amber-200">
                  متبقي لك <strong>{remainingInCurrentBook}</strong> صفحة في "{currentBook.title}"، يُقترح إنهاؤها ثم الانتقال إلى{" "}
                  {nextBook ? `"${nextBook.title}"` : "الكتاب التالي"} لإتمام النصاب الأسبوعي.
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

              {/* Book select */}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">الكتاب</Label>
                <Select value={bookId} onValueChange={setBookId}>
                  <SelectTrigger data-testid="select-book" className="rounded-xl h-11" style={{ backgroundColor: 'hsl(217,36%,16%)', border: '1px solid hsl(217,36%,24%)' }}>
                    <SelectValue placeholder="اختر الكتاب" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBooks.map(book => (
                      <SelectItem key={book.id} value={book.id.toString()}>
                        <span className="flex items-center gap-2">
                          {book.id === currentBook?.id && <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
                          {book.title}
                          <span className="text-muted-foreground text-xs">({book.totalPages} صفحة)</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Progress in current book */}
              {selectedBook && parseInt(bookId) === currentBook?.id && user?.lastPage !== undefined && user.lastPage > 0 && (
                <div className="p-3 rounded-xl text-sm" style={{ backgroundColor: 'hsl(218,47%,9%)', border: '1px solid hsl(217,36%,20%)' }}>
                  <div className="flex justify-between mb-2 text-xs text-muted-foreground">
                    <span>تقدمك في الكتاب</span>
                    <span>{user.lastPage} / {selectedBook.totalPages} صفحة</span>
                  </div>
                  <Progress value={(user.lastPage / selectedBook.totalPages) * 100} className="h-1.5" />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    متبقي: <strong className="text-foreground">{remainingInCurrentBook}</strong> صفحة
                  </p>
                </div>
              )}

              {/* Page range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">من صفحة</Label>
                  <Input
                    data-testid="input-start-page"
                    type="number"
                    min="1"
                    value={startPage}
                    onChange={e => setStartPage(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="rounded-xl h-11 text-center"
                    style={{ backgroundColor: 'hsl(217,36%,16%)', border: '1px solid hsl(217,36%,24%)' }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">إلى صفحة</Label>
                  <Input
                    data-testid="input-end-page"
                    type="number"
                    min={startPage}
                    max={499}
                    value={endPage}
                    onChange={e => setEndPage(parseInt(e.target.value) || startPage)}
                    required
                    className="rounded-xl h-11 text-center"
                    style={{ backgroundColor: 'hsl(217,36%,16%)', border: '1px solid hsl(217,36%,24%)' }}
                  />
                </div>
              </div>

              {/* Quota indicator */}
              {bookId && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">النصاب الأسبوعي</span>
                    <span className={isOverQuota ? "text-amber-400 font-medium" : "text-primary font-medium"}>
                      {pagesCount} / {weeklyQuota} صفحة
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'hsl(217,36%,20%)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, (pagesCount / weeklyQuota) * 100)}%`,
                        backgroundColor: isOverQuota ? 'hsl(38,92%,50%)' : 'hsl(46,65%,52%)'
                      }}
                    />
                  </div>
                  {isOverQuota && (
                    <p className="text-xs text-amber-400 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      قراءة أكثر من {weeklyQuota} صفحة مسموحة لكنها تؤثر على نسبة الالتزام
                    </p>
                  )}
                </div>
              )}

              {/* Completion notice */}
              {isWillFinishBook && selectedBook && (
                <div className="p-3 rounded-xl text-sm font-medium text-emerald-300" style={{ backgroundColor: 'hsl(142,40%,8%)', border: '1px solid hsl(142,40%,20%)' }}>
                  <CheckCircle className="w-4 h-4 inline ml-1.5" />
                  تهانينا! ستنهي كتاب "{selectedBook.title}" بهذا الورد.
                </div>
              )}

              {/* Reflection */}
              <div className="space-y-1.5">
                <Label className="text-sm text-muted-foreground">فائدة أو تأمل (اختياري)</Label>
                <Textarea
                  data-testid="input-reflection"
                  placeholder="شاركنا أبرز ما استفدته من هذه القراءة..."
                  className="min-h-[80px] rounded-xl resize-none"
                  style={{ backgroundColor: 'hsl(217,36%,16%)', border: '1px solid hsl(217,36%,24%)' }}
                  value={reflection}
                  onChange={e => setReflection(e.target.value)}
                />
              </div>

              <Button
                data-testid="button-submit"
                type="submit"
                className="w-full h-11 rounded-xl font-bold text-base"
                disabled={createLog.isPending || !bookId}
              >
                {createLog.isPending
                  ? <Loader2 className="w-5 h-5 animate-spin" />
                  : "اعتماد الورد الأسبوعي"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "الصفحات المقروءة", value: totalPagesRead, icon: TrendingUp, testid: "text-total-pages", color: "text-primary" },
            { label: "الكتب المنجزة", value: completedBookIds.length, icon: CheckCircle, testid: "text-completed-books", color: "text-emerald-400" },
            { label: "آخر صفحة", value: user?.lastPage || 0, icon: BookOpen, testid: "text-last-page", color: "text-blue-400" },
          ].map((stat) => (
            <Card key={stat.label} className="rounded-xl border" style={cardStyle}>
              <CardContent className="p-4 text-center">
                <stat.icon className={`w-4 h-4 mx-auto mb-1.5 ${stat.color}`} />
                <p data-testid={stat.testid} className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Phase books */}
        <div>
          <h3 className="text-base font-bold mb-3" style={{ fontFamily: 'Cairo, sans-serif' }}>
            كتب المرحلة {user?.phaseNumber}
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {phaseBooks.map((book) => {
              const isCompleted = completedBookIds.includes(book.id);
              const isCurrent = user?.currentBookId === book.id;

              return (
                <div
                  key={book.id}
                  data-testid={`card-book-${book.id}`}
                  className="flex items-center gap-4 p-4 rounded-xl"
                  style={{
                    backgroundColor: isCompleted ? 'hsl(142,40%,9%)' : 'hsl(218,39%,12%)',
                    border: `1px solid ${isCompleted ? 'hsl(142,40%,22%)' : isCurrent ? 'hsl(46,65%,40%,0.6)' : 'hsl(217,36%,20%)'}`,
                  }}
                >
                  {/* Status icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isCompleted ? 'bg-emerald-400/15' : isCurrent ? 'bg-primary/15' : 'bg-white/5'
                  }`}>
                    {isCompleted
                      ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                      : isCurrent
                        ? <BookOpen className="w-4 h-4 text-primary" />
                        : <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                    }
                  </div>

                  {/* Book info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-sm truncate">{book.title}</span>
                      {isCompleted && <Badge className="bg-emerald-600/20 text-emerald-400 text-xs shrink-0">مكتمل</Badge>}
                      {isCurrent && !isCompleted && <Badge className="bg-primary/20 text-primary text-xs shrink-0">حالي</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{book.bookCode}</span>
                      <span>{book.totalPages} صفحة</span>
                      <span>{book.levelType === 'basic' ? 'أساسي' : 'اختياري'}</span>
                    </div>
                    {isCurrent && !isCompleted && user?.lastPage !== undefined && user.lastPage > 0 && (
                      <Progress
                        value={(user.lastPage / book.totalPages) * 100}
                        className="h-1 mt-2"
                      />
                    )}
                  </div>

                  {/* PDF download */}
                  {book.pdfUrl && (
                    <a href={book.pdfUrl} target="_blank" rel="noreferrer" data-testid={`link-pdf-${book.id}`}>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg shrink-0 text-muted-foreground hover:text-foreground">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
              );
            })}

            {phaseBooks.length === 0 && (
              <div className="py-10 text-center text-muted-foreground rounded-xl text-sm" style={{ border: '1px solid hsl(217,36%,20%)' }}>
                لا توجد كتب مسجلة لهذه المرحلة حالياً
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
