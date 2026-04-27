import { useState, useEffect } from "react";
import { useListCurriculum, useCreateCurriculum, useUpdateCurriculum, useDeleteCurriculum } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, BookOpen, Download } from "lucide-react";

export default function AdminCurriculum() {
  const { data: curriculum, isLoading, refetch } = useListCurriculum();
  const createBook = useCreateCurriculum();
  const updateBook = useUpdateCurriculum();
  const deleteBook = useDeleteCurriculum();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editBook, setEditBook] = useState<any>(null);
  const [form, setForm] = useState({
    title: "",
    phaseNumber: "1",
    levelType: "basic",
    totalPages: "",
    author: "",
    pdfUrl: "",
    bookCode: "" // سيتم توليده تلقائياً
  });

  // إصلاح 3.2: توليد الرمز تلقائياً
  useEffect(() => {
    if (form.title && form.phaseNumber && form.totalPages) {
      const code = `${form.title.substring(0, 2)}-P${form.phaseNumber}-S${form.totalPages}`;
      setForm(prev => ({ ...prev, bookCode: code }));
    }
  }, [form.title, form.phaseNumber, form.totalPages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...form, phaseNumber: parseInt(form.phaseNumber), totalPages: parseInt(form.totalPages) };
    
    if (editBook) {
      updateBook.mutate({ id: editBook.id, data }, {
        onSuccess: () => { toast.success("تم التحديث"); setEditBook(null); refetch(); }
      });
    } else {
      createBook.mutate({ data }, {
        onSuccess: () => { toast.success("تمت الإضافة"); setIsAddModalOpen(false); refetch(); }
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[#D4AF37]">المنهج الدراسي</h2>
          <Button onClick={() => { setEditBook(null); setForm({title:"", phaseNumber:"1", levelType:"basic", totalPages:"", author:"", pdfUrl:"", bookCode:""}); setIsAddModalOpen(true); }} className="rounded-xl gap-2 font-bold"><Plus className="w-4 h-4"/> إضافة كتاب</Button>
        </div>

        {/* الجدول المحاذي بدقة (3.1) */}
        <div className="rounded-xl overflow-hidden border border-[#1e293b] bg-[#0f172a] shadow-lg overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader className="bg-[#161e2f]">
              <TableRow className="border-[#1e293b]">
                <TableHead className="text-right text-[#94a3b8] font-bold px-6">اسم الكتاب</TableHead>
                <TableHead className="text-right text-[#94a3b8] font-bold">الرمز</TableHead>
                <TableHead className="text-right text-[#94a3b8] font-bold">المرحلة</TableHead>
                <TableHead className="text-right text-[#94a3b8] font-bold">المستوى</TableHead>
                <TableHead className="text-right text-[#94a3b8] font-bold">الصفحات</TableHead>
                <TableHead className="text-center text-[#94a3b8] font-bold">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {curriculum?.map((book) => (
                <TableRow key={book.id} className="border-[#1e293b]">
                  <TableCell className="text-right px-6 font-medium">{book.title}</TableCell>
                  <TableCell className="text-right text-xs font-mono text-muted-foreground">{book.bookCode}</TableCell>
                  <TableCell className="text-right">المرحلة {book.phaseNumber}</TableCell>
                  <TableCell className="text-right"><Badge variant="outline">{book.levelType === 'basic' ? 'أساسي' : 'اختياري'}</Badge></TableCell>
                  <TableCell className="text-right">{book.totalPages}</TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => { setEditBook(book); setForm({title:book.title, phaseNumber:book.phaseNumber.toString(), levelType:book.levelType, totalPages:book.totalPages.toString(), author:book.author || "", pdfUrl:book.pdfUrl || "", bookCode:book.bookCode}); setIsAddModalOpen(true); }} className="text-blue-400 h-8 w-8"><Pencil className="w-4 h-4"/></Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteBook.mutate({id:book.id}, {onSuccess:()=>refetch()})} className="text-red-400 h-8 w-8"><Trash2 className="w-4 h-4"/></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Modal للإضافة والتعديل المبسط (3.3) */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[550px] rounded-2xl bg-[#0d1425] border-[#1e293b] text-right">
            <DialogHeader><DialogTitle className="text-right">{editBook ? "تعديل بيانات الكتاب" : "إضافة كتاب جديد"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>اسم الكتاب</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="rounded-xl"/></div>
                <div className="space-y-1.5"><Label>المؤلف</Label><Input value={form.author} onChange={e => setForm({...form, author: e.target.value})} className="rounded-xl"/></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label>رقم المرحلة</Label><Input type="number" value={form.phaseNumber} onChange={e => setForm({...form, phaseNumber: e.target.value})} className="rounded-xl"/></div>
                <div className="space-y-1.5"><Label>عدد الصفحات</Label><Input type="number" value={form.totalPages} onChange={e => setForm({...form, totalPages: e.target.value})} className="rounded-xl"/></div>
                <div className="space-y-1.5"><Label>المستوى</Label><Select value={form.levelType} onValueChange={v => setForm({...form, levelType: v})}><SelectTrigger className="rounded-xl"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="basic">أساسي</SelectItem><SelectItem value="optional">اختياري</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-1.5"><Label>رابط الكتاب (PDF / Drive)</Label><Input value={form.pdfUrl} onChange={e => setForm({...form, pdfUrl: e.target.value})} className="rounded-xl" dir="ltr"/></div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10"><Label className="text-xs text-muted-foreground">رمز الكتاب المولد تلقائياً:</Label><p className="font-mono text-primary text-sm mt-1">{form.bookCode}</p></div>
              <Button type="submit" className="w-full rounded-xl font-bold h-11 mt-4">اعتماد البيانات</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
