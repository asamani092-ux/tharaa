import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  BookCheck, 
  Award, 
  TrendingUp, 
  Star, 
  Zap, 
  Trophy,
  Loader2
} from "lucide-react";

export default function AdminOverview() {
  // 🌟 الحل الجذري (1.1): جلب البيانات مباشرة من ملف analytics.php المطور 
  // لضمان حساب الإنجاز السابق بشكل دقيق ومتطابق مع تبويب الإحصائيات
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics-overview-direct'],
    queryFn: async () => {
      const res = await fetch('/api/analytics.php');
      if (!res.ok) throw new Error('فشل جلب البيانات');
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" />
          <p className="text-muted-foreground animate-pulse">جاري جمع الإحصائيات الشاملة...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 text-right" dir="rtl">
        
        {/* العناوين الرئيسية (تصحيح 1.3: الإحصائيات) */}
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold flex items-center gap-3" style={{ color: '#D4AF37', fontFamily: 'Cairo, sans-serif' }}>
            <TrendingUp className="w-8 h-8" /> الإحصائيات
          </h2>
          <p className="text-muted-foreground">ملخص الأداء العام للمشاركين والدفعات شاملة الإنجازات السابقة.</p>
        </div>

        {/* بطاقات الأرقام الكبرى */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-3xl shadow-xl border-b-4 border-b-blue-500 overflow-hidden">
            <CardContent className="pt-8 pb-8 flex justify-between items-center px-8">
              <div>
                <p className="text-muted-foreground text-sm font-bold mb-1">إجمالي المشاركين</p>
                <h3 className="text-4xl font-black">{analytics?.overview?.totalStudents || 0}</h3>
              </div>
              <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <Users className="text-blue-400 w-8 h-8" />
              </div>
            </CardContent>
          </Card>

          {/* تصحيح 1.3: عدد الكتب المنجزة */}
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-3xl shadow-xl border-b-4 border-b-emerald-500 overflow-hidden">
            <CardContent className="pt-8 pb-8 flex justify-between items-center px-8">
              <div>
                <p className="text-muted-foreground text-sm font-bold mb-1">عدد الكتب المنجزة</p>
                <h3 className="text-4xl font-black">{analytics?.overview?.totalBooksCompleted || 0}</h3>
              </div>
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                <BookCheck className="text-emerald-400 w-8 h-8" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#0f172a] border-[#1e293b] rounded-3xl shadow-xl border-b-4 border-b-[#D4AF37] overflow-hidden">
            <CardContent className="pt-8 pb-8 flex justify-between items-center px-8">
              <div>
                <p className="text-muted-foreground text-sm font-bold mb-1">نسبة الإنجاز العام</p>
                <h3 className="text-4xl font-black text-[#D4AF37]">{analytics?.overview?.avgCompletionRate || 0}%</h3>
              </div>
              <div className="w-14 h-14 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center">
                <Award className="text-[#D4AF37] w-8 h-8" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* قسم النخبة والمتميزين */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* الأعلى قراءة بالصفحات */}
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-3xl shadow-2xl overflow-hidden">
            <CardHeader className="bg-[#161e2f]/50 border-b border-white/5 py-5 px-8 flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-3"><Trophy className="w-5 h-5 text-[#D4AF37]"/> فرسان القراءة (الأعلى صفحات)</CardTitle>
              <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {analytics?.usersDetail?.sort((a:any, b:any) => b.totalReadPages - a.totalReadPages).slice(0, 5).map((user:any, i:number) => (
                  <div key={user.id} className="flex justify-between items-center py-5 px-8 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-4">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-[#D4AF37] text-black' : 'bg-[#1e293b] text-muted-foreground'}`}>
                        {i + 1}
                      </span>
                      <span className="font-bold text-lg">{user.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[#D4AF37] font-black text-xl">{user.totalReadPages}</span>
                      <span className="text-xs text-muted-foreground mr-1">صفحة</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* الأعلى التزاماً بالرصد */}
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-3xl shadow-2xl overflow-hidden">
            <CardHeader className="bg-[#161e2f]/50 border-b border-white/5 py-5 px-8">
              <CardTitle className="text-lg flex items-center gap-3"><Star className="w-5 h-5 text-blue-400"/> الأكثر التزاماً بالرصد (آخر شهر)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {analytics?.topCommitted?.map((user:any, i:number) => (
                  <div key={i} className="flex justify-between items-center py-5 px-8 hover:bg-white/[0.02] transition-colors">
                    <span className="font-bold text-lg">{user.name}</span>
                    <div className="bg-blue-500/10 text-blue-400 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-500/20">
                      {user.logs_count} تسجيلات
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* إحصائيات الدفعات */}
        <div className="rounded-3xl border border-[#1e293b] bg-[#0f172a] overflow-hidden shadow-2xl">
          <div className="bg-[#161e2f]/50 px-8 py-5 border-b border-white/5">
            <h3 className="text-xl font-bold text-white flex items-center gap-3">
              <Users className="w-6 h-6 text-emerald-400" /> تفاصيل إنجاز الدفعات
            </h3>
          </div>
          <Table>
            <TableHeader className="bg-[#161e2f]/30">
              <TableRow className="border-[#1e293b]">
                <TableHead className="text-right text-[#94a3b8] font-bold py-4 px-8">اسم الدفعة</TableHead>
                <TableHead className="text-center text-[#94a3b8] font-bold">عدد المشاركين</TableHead>
                <TableHead className="text-center text-[#94a3b8] font-bold">إجمالي الصفحات</TableHead>
                {/* تصحيح 1.2: نسبة متوسط الإنجاز */}
                <TableHead className="text-right text-[#94a3b8] font-bold px-8 w-[300px]">نسبة متوسط الإنجاز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.batchStats?.map((batch:any) => (
                <TableRow key={batch.batchId} className="border-[#1e293b] hover:bg-white/[0.02] transition-all">
                  <TableCell className="py-6 px-8 font-black text-lg">{batch.batchName}</TableCell>
                  <TableCell className="text-center font-bold text-blue-400">{batch.studentCount}</TableCell>
                  <TableCell className="text-center font-bold text-[#D4AF37]">{batch.totalPages?.toLocaleString() || 0}</TableCell>
                  <TableCell className="px-8">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs mb-1 font-bold">
                        <span className="text-[#D4AF37]">{batch.avgCompletionRate}%</span>
                        <span className="text-muted-foreground">متوسط الإنجاز للدفعة</span>
                      </div>
                      <Progress value={batch.avgCompletionRate} className="h-2.5 bg-white/5" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

      </div>
    </AdminLayout>
  );
}
