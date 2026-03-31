import { useGetMe, useListCurriculum, useGetMyLogs } from "@workspace/api-client-react";
import { StudentLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Download, Book, CheckCircle, TrendingUp, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const cardStyle = { backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' };

export default function StudentPortal() {
  const { data: session } = useGetMe();
  const user = session?.user;

  const { data: books } = useListCurriculum({
    query: {
      enabled: !!user?.phaseNumber,
    }
  });

  const { data: logs } = useGetMyLogs();

  const phaseBooks = books?.filter(b => b.phaseNumber === user?.phaseNumber) || [];
  const completedBookIds = user?.completedBooks || [];

  const currentBook = phaseBooks.find(b => b.id === user?.currentBookId);
  const totalPagesRead = logs?.reduce((sum, log) => sum + log.pagesRead, 0) || 0;

  const stats = [
    { label: "الصفحات المقروءة", value: totalPagesRead, icon: TrendingUp, testid: "text-total-pages" },
    { label: "الكتب المنجزة", value: completedBookIds.length, icon: CheckCircle, testid: "text-completed-books" },
    { label: "آخر صفحة في الكتاب الحالي", value: user?.lastPage || 0, icon: AlertCircle, testid: "text-last-page" },
  ];

  return (
    <StudentLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'Cairo, sans-serif' }}>مرحباً، {user?.name}</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              المرحلة: {user?.phaseNumber} | المستوى: {user?.levelType === 'basic' ? 'أساسي' : 'اختياري'}
            </p>
          </div>
          <Link href="/student/submit">
            <Button data-testid="button-submit-log" className="rounded-xl gap-2">
              <Book className="w-4 h-4" />
              تسجيل ورد القراءة
            </Button>
          </Link>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="rounded-xl border" style={cardStyle}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary shrink-0">
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p data-testid={stat.testid} className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Current book progress */}
        {currentBook && (
          <Card className="rounded-xl border" style={{ ...cardStyle, borderColor: 'hsl(46,65%,52%,0.3)' }}>
            <CardHeader style={{ borderBottom: '1px solid hsl(217,36%,18%)' }}>
              <CardTitle className="text-base flex justify-between items-center" style={{ fontFamily: 'Cairo, sans-serif' }}>
                <span>الكتاب الحالي: {currentBook.title}</span>
                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
                  {user?.lastPage} / {currentBook.totalPages} صفحة
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <Progress
                value={Math.min(100, ((user?.lastPage || 0) / currentBook.totalPages) * 100)}
                className="h-2 mb-2"
              />
              <p className="text-xs text-muted-foreground text-left">
                {Math.round(((user?.lastPage || 0) / currentBook.totalPages) * 100)}% مكتمل
              </p>
            </CardContent>
          </Card>
        )}

        {/* Books grid */}
        <div>
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>كتب المرحلة {user?.phaseNumber}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {phaseBooks.map((book) => {
              const isCompleted = completedBookIds.includes(book.id);
              const isCurrent = user?.currentBookId === book.id;

              return (
                <Card
                  key={book.id}
                  data-testid={`card-book-${book.id}`}
                  className="rounded-xl border flex flex-col h-full"
                  style={{
                    backgroundColor: isCompleted ? 'hsl(142,40%,10%)' : 'hsl(218,39%,12%)',
                    borderColor: isCompleted ? 'hsl(142,40%,22%)' : isCurrent ? 'hsl(46,65%,52%,0.5)' : 'hsl(217,36%,20%)',
                  }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-1.5">
                      <Badge variant="outline" className="text-xs border-muted text-muted-foreground">{book.bookCode}</Badge>
                      {isCompleted && <Badge className="bg-emerald-600/20 text-emerald-400 text-xs">مكتمل</Badge>}
                      {isCurrent && !isCompleted && <Badge className="bg-primary/20 text-primary text-xs">حالي</Badge>}
                    </div>
                    <CardTitle className="text-sm font-semibold line-clamp-2">{book.title}</CardTitle>
                    {book.author && <p className="text-xs text-muted-foreground">{book.author}</p>}
                  </CardHeader>
                  <CardContent className="flex-1 pb-0">
                    <p className="text-xs text-muted-foreground">{book.totalPages} صفحة</p>
                    {book.publisher && <p className="text-xs text-muted-foreground mt-0.5">{book.publisher}</p>}
                  </CardContent>
                  <div className="p-4 pt-3 mt-auto" style={{ borderTop: '1px solid hsl(217,36%,18%)' }}>
                    {book.pdfUrl ? (
                      <a href={book.pdfUrl} target="_blank" rel="noreferrer" data-testid={`link-pdf-${book.id}`}>
                        <Button variant="outline" className="w-full gap-2 rounded-xl text-xs h-8">
                          <Download className="w-3.5 h-3.5" />
                          تحميل PDF
                        </Button>
                      </a>
                    ) : (
                      <Button variant="outline" className="w-full rounded-xl text-xs h-8" disabled>PDF غير متوفر</Button>
                    )}
                  </div>
                </Card>
              );
            })}

            {phaseBooks.length === 0 && (
              <div className="col-span-full py-10 text-center text-muted-foreground rounded-xl" style={{ border: '1px solid hsl(217,36%,20%)' }}>
                لا توجد كتب مسجلة لهذه المرحلة حالياً
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
