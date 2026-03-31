import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useGetMe, useListCurriculum, useCreateLog, useGetSettings } from "@workspace/api-client-react";
import { StudentLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMeQueryKey, getGetMyLogsQueryKey } from "@workspace/api-client-react";

export default function SubmitLog() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { data: session } = useGetMe();
  const user = session?.user;
  
  const { data: settings } = useGetSettings();
  const { data: books } = useListCurriculum({ 
    query: { enabled: !!user?.phaseNumber } 
  });

  const phaseBooks = books?.filter(b => b.phaseNumber === user?.phaseNumber && !user?.completedBooks.includes(b.id)) || [];
  const currentBook = phaseBooks.find(b => b.id === user?.currentBookId) || phaseBooks[0];

  const [bookId, setBookId] = useState<string>(currentBook?.id.toString() || "");
  const [startPage, setStartPage] = useState<number>((user?.lastPage || 0) + 1);
  const [endPage, setEndPage] = useState<number>((user?.lastPage || 0) + (settings?.weeklyQuota || 0));
  const [reflection, setReflection] = useState("");

  const createLog = useCreateLog();

  useEffect(() => {
    if (currentBook && !bookId) {
      setBookId(currentBook.id.toString());
    }
  }, [currentBook, bookId]);

  useEffect(() => {
    if (user?.lastPage !== undefined && settings?.weeklyQuota !== undefined && user.currentBookId?.toString() === bookId) {
      setStartPage(user.lastPage + 1);
      setEndPage(user.lastPage + settings.weeklyQuota);
    } else {
      setStartPage(1);
      setEndPage(settings?.weeklyQuota || 50);
    }
  }, [user?.lastPage, settings?.weeklyQuota, bookId, user?.currentBookId]);

  const selectedBook = phaseBooks.find(b => b.id.toString() === bookId);
  const isCompleted = selectedBook ? endPage >= selectedBook.totalPages : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookId) return;

    if (startPage > endPage) {
      toast.error("صفحة النهاية يجب أن تكون أكبر من صفحة البداية");
      return;
    }

    createLog.mutate(
      { 
        data: { 
          bookId: parseInt(bookId), 
          startPage, 
          endPage: Math.min(endPage, selectedBook?.totalPages || endPage), 
          isCompleted,
          reflection: reflection.trim() || undefined
        } 
      },
      {
        onSuccess: () => {
          toast.success("تم تسجيل الورد بنجاح");
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMyLogsQueryKey() });
          setLocation("/student");
        },
        onError: (err: any) => {
          toast.error(err?.error || "حدث خطأ أثناء تسجيل الورد");
        }
      }
    );
  };

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button data-testid="button-back" variant="outline" size="icon" onClick={() => setLocation("/student")}>
            <ArrowRight className="w-4 h-4" />
          </Button>
          <h2 className="text-3xl font-bold">تسجيل ورد القراءة</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>تفاصيل الورد الأسبوعي</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>الكتاب</Label>
                <Select value={bookId} onValueChange={setBookId}>
                  <SelectTrigger data-testid="select-book">
                    <SelectValue placeholder="اختر الكتاب" />
                  </SelectTrigger>
                  <SelectContent>
                    {phaseBooks.map(book => (
                      <SelectItem key={book.id} value={book.id.toString()}>
                        {book.title} ({book.totalPages} صفحة)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>من صفحة</Label>
                  <Input 
                    data-testid="input-start-page"
                    type="number" 
                    min="1"
                    value={startPage} 
                    onChange={e => setStartPage(parseInt(e.target.value) || 1)}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label>إلى صفحة</Label>
                  <Input 
                    data-testid="input-end-page"
                    type="number" 
                    min={startPage}
                    value={endPage} 
                    onChange={e => setEndPage(parseInt(e.target.value) || startPage)}
                    required 
                  />
                </div>
              </div>

              {selectedBook && (
                <div className="p-4 bg-muted rounded-md text-sm">
                  مجموع الصفحات المقروءة: <strong>{Math.max(0, endPage - startPage + 1)}</strong> صفحة
                </div>
              )}

              {isCompleted && (
                <div className="p-4 bg-green-900/20 border border-green-700 rounded-md text-green-400 font-medium">
                  تهانينا! يبدو أنك ستنهي هذا الكتاب بهذا الورد.
                </div>
              )}

              <div className="space-y-2">
                <Label>فائدة أو تأمل (اختياري)</Label>
                <Textarea 
                  data-testid="input-reflection"
                  placeholder="شاركنا أبرز ما استفدته من هذه القراءة..." 
                  className="min-h-[100px]"
                  value={reflection}
                  onChange={e => setReflection(e.target.value)}
                />
              </div>

              <Button data-testid="button-submit" type="submit" className="w-full" disabled={createLog.isPending || !bookId}>
                {createLog.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "اعتماد الورد"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
