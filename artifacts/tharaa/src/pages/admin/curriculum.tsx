import { useState } from "react";
import { useListCurriculum, useCreateCurriculumBook, useDeleteCurriculumBook, getListCurriculumQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";

export default function AdminCurriculum() {
  const queryClient = useQueryClient();
  const { data: books, isLoading } = useListCurriculum();
  const createBook = useCreateCurriculumBook();
  const deleteBook = useDeleteCurriculumBook();

  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    phaseNumber: 1,
    phaseName: "",
    levelType: "basic",
    bookCode: "",
    title: "",
    totalPages: 100,
    author: "",
    pdfUrl: "",
    orderInLevel: 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBook.mutate({ data: formData }, {
      onSuccess: () => {
        toast.success("تمت إضافة الكتاب بنجاح");
        setIsOpen(false);
        queryClient.invalidateQueries({ queryKey: getListCurriculumQueryKey() });
        setFormData({ ...formData, bookCode: "", title: "", pdfUrl: "", author: "" });
      },
      onError: () => toast.error("حدث خطأ أثناء الإضافة")
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("تأكيد حذف هذا الكتاب من المنهج؟")) {
      deleteBook.mutate({ id }, {
        onSuccess: () => {
          toast.success("تم الحذف بنجاح");
          queryClient.invalidateQueries({ queryKey: getListCurriculumQueryKey() });
        }
      });
    }
  };

  const phases = Array.from(new Set(books?.map(b => b.phaseNumber))).sort((a, b) => a - b);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">المنهج الدراسي</h2>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-book" className="gap-2"><Plus className="w-4 h-4" /> إضافة كتاب</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader><DialogTitle>إضافة كتاب جديد</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المرحلة (رقم)</Label>
                    <Input data-testid="input-book-phase-number" type="number" value={formData.phaseNumber} onChange={e => setFormData({...formData, phaseNumber: parseInt(e.target.value)})} required />
                  </div>
                  <div className="space-y-2">
                    <Label>اسم المرحلة</Label>
                    <Input data-testid="input-book-phase-name" value={formData.phaseName} onChange={e => setFormData({...formData, phaseName: e.target.value})} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المستوى</Label>
                    <Select value={formData.levelType} onValueChange={v => setFormData({...formData, levelType: v})}>
                      <SelectTrigger data-testid="select-book-level"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">أساسي</SelectItem>
                        <SelectItem value="optional">اختياري</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>رمز الكتاب</Label>
                    <Input data-testid="input-book-code" value={formData.bookCode} onChange={e => setFormData({...formData, bookCode: e.target.value})} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>عنوان الكتاب</Label>
                  <Input data-testid="input-book-title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>المؤلف</Label>
                    <Input data-testid="input-book-author" value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>عدد الصفحات</Label>
                    <Input data-testid="input-book-pages" type="number" value={formData.totalPages} onChange={e => setFormData({...formData, totalPages: parseInt(e.target.value)})} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>رابط PDF</Label>
                  <Input data-testid="input-book-pdf" value={formData.pdfUrl} onChange={e => setFormData({...formData, pdfUrl: e.target.value})} dir="ltr" />
                </div>
                <Button data-testid="button-save-book" type="submit" className="w-full" disabled={createBook.isPending}>
                  {createBook.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "حفظ الكتاب"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : books?.length === 0 ? (
          <div className="bg-card border border-border p-12 text-center rounded-lg text-muted-foreground">لا يوجد كتب في المنهج</div>
        ) : (
          <div className="space-y-8">
            {phases.map(phase => (
              <div key={phase} className="space-y-4">
                <h3 className="text-xl font-bold text-primary">المرحلة {phase}</h3>
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>الرمز</TableHead>
                        <TableHead>العنوان</TableHead>
                        <TableHead>المستوى</TableHead>
                        <TableHead>الصفحات</TableHead>
                        <TableHead className="text-left">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {books?.filter(b => b.phaseNumber === phase).sort((a,b) => a.orderInLevel - b.orderInLevel).map(book => (
                        <TableRow key={book.id}>
                          <TableCell className="font-mono text-sm">{book.bookCode}</TableCell>
                          <TableCell className="font-medium">{book.title}</TableCell>
                          <TableCell>{book.levelType === 'basic' ? 'أساسي' : 'اختياري'}</TableCell>
                          <TableCell>{book.totalPages}</TableCell>
                          <TableCell className="text-left">
                            <Button data-testid={`button-delete-book-${book.id}`} size="icon" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(book.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
