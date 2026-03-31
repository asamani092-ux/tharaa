import { useGetMe, useListCurriculum, useGetMyLogs } from "@workspace/api-client-react";
import { StudentLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Download, Book, CheckCircle, TrendingUp, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

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

  return (
    <StudentLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold">مرحباً، {user?.name}</h2>
            <p className="text-muted-foreground mt-1">المرحلة: {user?.phaseNumber} | المستوى: {user?.levelType === 'basic' ? 'أساسي' : 'اختياري'}</p>
          </div>
          <Link href="/student/submit">
            <Button data-testid="button-submit-log" size="lg" className="font-bold gap-2">
              <Book className="w-5 h-5" />
              تسجيل ورد القراءة
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 border-primary/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الصفحات المقروءة</p>
                <p data-testid="text-total-pages" className="text-2xl font-bold">{totalPagesRead}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-primary/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الكتب المنجزة</p>
                <p data-testid="text-completed-books" className="text-2xl font-bold">{completedBookIds.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 border-primary/20">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-full text-primary">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">آخر صفحة (الكتاب الحالي)</p>
                <p data-testid="text-last-page" className="text-2xl font-bold">{user?.lastPage || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {currentBook && (
          <Card className="border-primary">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="flex justify-between items-center">
                <span>الكتاب الحالي: {currentBook.title}</span>
                <Badge variant="default">{user?.lastPage} / {currentBook.totalPages} صفحة</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Progress 
                value={Math.min(100, ((user?.lastPage || 0) / currentBook.totalPages) * 100)} 
                className="h-3 mb-2" 
              />
              <p className="text-sm text-muted-foreground text-left">
                {Math.round(((user?.lastPage || 0) / currentBook.totalPages) * 100)}% مكتمل
              </p>
            </CardContent>
          </Card>
        )}

        <div>
          <h3 className="text-2xl font-bold mb-6">كتب المرحلة {user?.phaseNumber}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {phaseBooks.map((book) => {
              const isCompleted = completedBookIds.includes(book.id);
              const isCurrent = user?.currentBookId === book.id;

              return (
                <Card key={book.id} data-testid={`card-book-${book.id}`} className={`flex flex-col h-full ${isCompleted ? 'bg-green-900/10 border-green-700/30' : isCurrent ? 'border-primary' : ''}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline">{book.bookCode}</Badge>
                      {isCompleted && <Badge className="bg-green-600 text-white">مكتمل</Badge>}
                      {isCurrent && <Badge variant="default">حالي</Badge>}
                    </div>
                    <CardTitle className="line-clamp-2">{book.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">{book.author || "مؤلف غير معروف"}</p>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <p className="text-sm">عدد الصفحات: {book.totalPages}</p>
                    {book.publisher && <p className="text-sm">الناشر: {book.publisher}</p>}
                  </CardContent>
                  <div className="p-4 border-t border-border mt-auto flex gap-2">
                    {book.pdfUrl ? (
                      <a href={book.pdfUrl} target="_blank" rel="noreferrer" className="flex-1" data-testid={`link-pdf-${book.id}`}>
                        <Button variant="outline" className="w-full gap-2">
                          <Download className="w-4 h-4" />
                          تحميل PDF
                        </Button>
                      </a>
                    ) : (
                      <Button variant="outline" className="w-full gap-2" disabled>
                        PDF غير متوفر
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
            
            {phaseBooks.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                لا توجد كتب مسجلة لهذه المرحلة حالياً
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
