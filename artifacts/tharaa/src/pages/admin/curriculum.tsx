import { useState, useEffect } from "react";
import { useListCurriculum } from "@workspace/api-client-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, BookOpen } from "lucide-react";

export default function AdminCurriculum() {
  const queryClient = useQueryClient();
  const { data: curriculum, isLoading, refetch } = useListCurriculum();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editBook, setEditBook] = useState<any>(null);
  const [form, setForm] = useState({
    title: "",
    phaseNumber: "1",
    levelType: "basic",
    totalPages: "",
    author: "",
    pdfUrl: "",
    bookCode: ""
  });

  // 🌟 التعديل المطلوب: توليد الرمز تلقائياً بنظام (P + رقم المرحلة + - + التسلسل)
  useEffect(() => {
    if (form.phaseNumber && curriculum) {
      // إذا كنا في وضع الإضافة أو قمنا بتغيير المرحلة أثناء التعديل
      if (!editBook || (editBook && editBook.phaseNumber !== parseInt(form.phaseNumber))) {
        // حساب عدد الكتب الموجودة حالياً في هذه المرحلة
        const booksInPhase = curriculum.filter(b => b.phaseNumber === parseInt(form.phaseNumber)).length;
        const nextSequence = booksInPhase + 1;
        const generatedCode = `P${form.phaseNumber}-${nextSequence}`;
        
        setForm(prev => ({ ...prev, bookCode: generatedCode }));
      }
    }
  }, [form.phaseNumber, curriculum, editBook]);

  // دوال العمليات (إضافة، تعديل، حذف) عبر fetch مباشر لتجنب أخطاء البناء
  const createBook = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error();
      return res.json();
    }
  });

  // 🌟 تعديل مسار التحديث ليتوافق مع PHP وإضافة كاشف الأخطاء
  const updateBook = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      // إرسال الـ id في الرابط وفي الجسم لضمان قراءته من السيرفر
      const res = await fetch(`/api/curriculum?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, id })
      });
      
      const text = await res.text();
      let jsonData;
      try { jsonData = JSON.parse(text); } catch(e) { throw new Error("لم يتمكن السيرفر من معالجة طلب التعديل"); }
      
      if (!res.ok) throw new Error(jsonData.error || "حدث خطأ أثناء التحديث");
      return jsonData;
    }
  });

  // 🌟 تعديل مسار الحذف ليتوافق مع PHP
  const deleteBook = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/curriculum?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("حدث خطأ أثناء الحذف");
      return res.json();
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { 
      ...form, 
      phaseNumber: parseInt(form.phaseNumber), 
      totalPages: parseInt(form.totalPages) 
    };
    
    if (editBook) {
      updateBook.mutate({ id: editBook.id, data: payload }, {
        onSuccess: () => { 
          toast.success("تم تحديث الكتاب بنجاح ✅"); 
          setEditBook(null); 
          setIsAddModalOpen(false); // 🌟 إغلاق النافذة بعد التعديل
          refetch(); 
        },
        onError: (err: any) => toast.error(err.message) // إظهار الخطأ الحقيقي إن وجد
      });
    } else {
      createBook.mutate(payload, {
        onSuccess: () => { 
          toast.success("تمت إضافة الكتاب بنجاح ✅"); 
          setIsAddModalOpen(false); 
          refetch(); 
        },
        onError: (err: any) => toast.error("حدث خطأ أثناء الإضافة")
      });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[#D4AF37]" style={{ fontFamily: 'Cairo, sans-serif' }}>المنهج الدراسي</h2>
          <Button 
            onClick={() => { 
              setEditBook(null); 
              setForm({title:"", phaseNumber:"1", levelType:"basic", totalPages:"", author:"", pdfUrl:"", bookCode:""}); 
              setIsAddModalOpen(true); 
            }} 
            className="rounded-xl gap-2 font-bold h-11 bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4"/> إضافة كتاب جديد
          </Button>
        </div>

        {/* الجدول مع إصلاح المحاذاة لجميع الشاشات (3.1) */}
        <div className="rounded-2xl overflow-hidden border border-[#1e293b] bg-[#0f172a] shadow-2xl">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
              <TableHeader className="bg-[#161e2f]">
                <TableRow className="border-[#1e293b] hover:bg-transparent">
                  <TableHead className="text-right text-[#94a3b8] font-bold px-6 py-4">اسم الكتاب</TableHead>
                  <TableHead className="text-center text-[#94a3b8] font-bold">الرمز</TableHead>
                  <TableHead className="text-center text-[#94a3b8] font-bold">المرحلة</TableHead>
                  <TableHead className="text-center text-[#94a3b8] font-bold">المستوى</TableHead>
                  <TableHead className="text-center text-[#94a3b8] font-bold">عدد الصفحات</TableHead>
                  <TableHead className="text-left text-[#94a3b8] font-bold px-6">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="animate-spin mx-auto text-[#D4AF37]"/></TableCell></TableRow>
                ) : (
                  curriculum?.map((book) => (
                    <TableRow key={book.id} className="border-[#1e293b] hover:bg-white/[0.02] transition-colors">
                      <TableCell className="text-right px-6 font-bold text-white flex items-center gap-3 py-4">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="w-4 h-4 text-primary" /></div>
                        {book.title}
                      </TableCell>
                      <TableCell className="text-center font-mono text-[#D4AF37] font-bold">{book.bookCode}</TableCell>
                      <TableCell className="text-center">المرحلة {book.phaseNumber}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="border-white/10 font-medium">{book.levelType === 'basic' ? 'أساسي' : 'اختياري'}</Badge></TableCell>
                      <TableCell className="text-center font-mono">{book.totalPages}</TableCell>
                      <TableCell className="text-left px-6">
                        <div className="flex justify-start gap-1">
                          <Button size="icon" variant="ghost" onClick={() => { 
                            setEditBook(book); 
                            setForm({title:book.title, phaseNumber:book.phaseNumber.toString(), levelType:book.levelType, totalPages:book.totalPages.toString(), author:book.author || "", pdfUrl:book.pdfUrl || "", bookCode:book.bookCode}); 
                            setIsAddModalOpen(true); 
                          }} className="text-blue-400 hover:bg-blue-400/10 h-9 w-9"><Pencil className="w-4 h-4"/></Button>
                          <Button size="icon" variant="ghost" onClick={() => { if(confirm("حذف الكتاب؟")) deleteBook.mutate(book.id, {onSuccess:()=>refetch()})}} className="text-red-400 hover:bg-red-400/10 h-9 w-9"><Trash2 className="w-4 h-4"/></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* نافذة الإضافة والتعديل */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-[550px] rounded-3xl bg-[#0d1425] border-[#1e293b] text-right" dir="rtl">
            <DialogHeader><DialogTitle className="text-right text-xl font-bold text-white">{editBook ? "تعديل بيانات الكتاب" : "إضافة كتاب جديد للمنهج"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label className="text-[#94a3b8]">اسم الكتاب</Label><Input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="rounded-xl bg-[#161e2f] border-[#1e293b] h-11" required/></div>
                <div className="space-y-1.5"><Label className="text-[#94a3b8]">المؤلف</Label><Input value={form.author} onChange={e => setForm({...form, author: e.target.value})} className="rounded-xl bg-[#161e2f] border-[#1e293b] h-11"/></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5"><Label className="text-[#94a3b8]">رقم المرحلة</Label><Input type="number" min="1" value={form.phaseNumber} onChange={e => setForm({...form, phaseNumber: e.target.value})} className="rounded-xl bg-[#161e2f] border-[#1e293b] h-11" required/></div>
                <div className="space-y-1.5"><Label className="text-[#94a3b8]">عدد الصفحات</Label><Input type="number" min="1" value={form.totalPages} onChange={e => setForm({...form, totalPages: e.target.value})} className="rounded-xl bg-[#161e2f] border-[#1e293b] h-11" required/></div>
                <div className="space-y-1.5">
                  <Label className="text-[#94a3b8]">المستوى</Label>
                  <Select value={form.levelType} onValueChange={v => setForm({...form, levelType: v})}>
                    <SelectTrigger className="rounded-xl bg-[#161e2f] border-[#1e293b] h-11"><SelectValue/></SelectTrigger>
                    <SelectContent><SelectItem value="basic">أساسي</SelectItem><SelectItem value="optional">اختياري</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5"><Label className="text-[#94a3b8]">رابط الكتاب (PDF / Drive)</Label><Input value={form.pdfUrl} onChange={e => setForm({...form, pdfUrl: e.target.value})} className="rounded-xl bg-[#161e2f] border-[#1e293b] h-11" dir="ltr"/></div>
              
              {/* 🌟 عرض الرمز المولد تلقائياً بشكل بارز */}
              <div className="bg-[#D4AF37]/5 p-4 rounded-2xl border border-[#D4AF37]/20 flex justify-between items-center">
                <span className="text-sm text-[#94a3b8]">رمز الكتاب المولد تلقائياً:</span>
                <span className="font-mono text-[#D4AF37] text-lg font-black tracking-widest">{form.bookCode}</span>
              </div>
              
              <Button type="submit" className="w-full rounded-2xl font-bold h-12 mt-2 shadow-lg" disabled={createBook.isPending || updateBook.isPending}>
                {createBook.isPending || updateBook.isPending ? <Loader2 className="animate-spin w-5 h-5"/> : (editBook ? "حفظ التعديلات" : "اعتماد إضافة الكتاب")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
