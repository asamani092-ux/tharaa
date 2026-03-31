import { useGetAnalyticsOverview } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const { data: analytics, isLoading } = useGetAnalyticsOverview();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  const stats = [
    { title: "إجمالي المستخدمين", value: analytics?.totalUsers || 0, icon: Users, color: "text-blue-500" },
    { title: "المستخدمين النشطين", value: analytics?.activeUsers || 0, icon: CheckCircle, color: "text-green-500" },
    { title: "طلبات معلقة", value: analytics?.pendingUsers || 0, icon: Clock, color: "text-yellow-500" },
    { title: "إجمالي الصفحات المقروءة", value: analytics?.totalPagesRead || 0, icon: BookOpen, color: "text-primary" },
    { title: "أوراد في الوقت", value: analytics?.onTimeSubmissions || 0, icon: CheckCircle, color: "text-green-400" },
    { title: "أوراد متأخرة", value: analytics?.lateSubmissions || 0, icon: AlertTriangle, color: "text-orange-400" },
    { title: "أوراد مفقودة", value: analytics?.missedSubmissions || 0, icon: AlertTriangle, color: "text-red-500" },
    { title: "كتب مكتملة", value: analytics?.completedBooksCount || 0, icon: FileText, color: "text-primary" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold">لوحة القيادة</h2>
          <p className="text-muted-foreground mt-1">نظرة عامة على أداء المنصة</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="bg-card">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value.toLocaleString()}</p>
                </div>
                <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <h3 className="text-2xl font-bold mt-8 mb-4">تفاصيل الدفعات</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics?.batchBreakdown?.map((batch) => (
            <Card key={batch.batchId}>
              <CardHeader className="bg-muted/50 pb-4">
                <CardTitle>{batch.batchName}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">عدد الطلاب:</span>
                  <span className="font-semibold">{batch.userCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الصفحات المقروءة:</span>
                  <span className="font-semibold">{batch.totalPagesRead.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">متوسط القراءة للطالب:</span>
                  <span className="font-semibold">{Math.round(batch.avgPagesPerUser).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!analytics?.batchBreakdown || analytics.batchBreakdown.length === 0) && (
            <div className="col-span-full py-8 text-center text-muted-foreground bg-card rounded-lg border border-border">
              لا توجد بيانات للدفعات حالياً
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
