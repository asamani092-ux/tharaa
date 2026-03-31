import { useGetAnalyticsOverview } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, FileText, CheckCircle, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { data: analytics, isLoading } = useGetAnalyticsOverview();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-40" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const stats = [
    { title: "إجمالي المشاركين", value: analytics?.totalUsers || 0, icon: Users, accent: "text-blue-400", bg: "bg-blue-400/10" },
    { title: "نشطون", value: analytics?.activeUsers || 0, icon: CheckCircle, accent: "text-emerald-400", bg: "bg-emerald-400/10" },
    { title: "طلبات معلقة", value: analytics?.pendingUsers || 0, icon: Clock, accent: "text-amber-400", bg: "bg-amber-400/10" },
    { title: "إجمالي الصفحات", value: analytics?.totalPagesRead || 0, icon: TrendingUp, accent: "text-primary", bg: "bg-primary/10" },
    { title: "إرسال في الوقت", value: analytics?.onTimeSubmissions || 0, icon: CheckCircle, accent: "text-emerald-400", bg: "bg-emerald-400/10" },
    { title: "إرسال متأخر", value: analytics?.lateSubmissions || 0, icon: AlertTriangle, accent: "text-orange-400", bg: "bg-orange-400/10" },
    { title: "عدم إرسال ", value: analytics?.missedSubmissions || 0, icon: AlertTriangle, accent: "text-red-400", bg: "bg-red-400/10" },
    { title: "عدد الكتب المقروؤة", value: analytics?.completedBooksCount || 0, icon: BookOpen, accent: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'Cairo, sans-serif' }}>لوحة القيادة</h2>
          <p className="text-muted-foreground text-sm mt-1">نظرة عامة على أداء المنصة</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="rounded-xl border" style={{ backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' }}>
              <CardContent className="p-5 flex flex-col gap-3 text-center">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.bg} ${stat.accent}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>تفاصيل الدفعات</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics?.batchBreakdown?.map((batch) => (
              <Card key={batch.batchId} className="rounded-xl border" style={{ backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' }}>
                <CardHeader className="pb-3" style={{ borderBottom: '1px solid hsl(217,36%,18%)' }}>
                  <CardTitle className="text-base font-semibold">{batch.batchName}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">عدد الطلاب</span>
                    <span className="font-semibold">{batch.userCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">الصفحات المقروءة</span>
                    <span className="font-semibold">{batch.totalPagesRead.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">متوسط للطالب</span>
                    <span className="font-semibold">{Math.round(batch.avgPagesPerUser).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!analytics?.batchBreakdown || analytics.batchBreakdown.length === 0) && (
              <div className="col-span-full py-10 text-center text-muted-foreground rounded-xl border" style={{ borderColor: 'hsl(217,36%,20%)' }}>
                لا توجد بيانات للدفعات حالياً
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
