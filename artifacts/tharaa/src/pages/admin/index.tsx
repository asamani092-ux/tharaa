import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Star, Trophy, Loader2 } from "lucide-react";

function StatCard({
  label,
  value,
  valueClassName = "text-[var(--text-primary)]",
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6 pb-6 px-6">
        <p className="text-[var(--font-sm)] text-[var(--text-secondary)] mb-2">{label}</p>
        <p className={`text-3xl md:text-4xl font-bold ${valueClassName}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminOverview() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["admin-analytics-overview"],
    queryFn: async () => {
      const res = await fetch("/api/analytics.php");
      if (!res.ok) throw new Error("فشل جلب البيانات");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--secondary-400)]" />
          <p className="text-[var(--text-secondary)]">جاري التحميل...</p>
        </div>
      </AdminLayout>
    );
  }

  const discipline = analytics?.disciplineLeaderboard ?? [];
  const elite = analytics?.eliteReadersLeaderboard ?? [];

  return (
    <AdminLayout>
      <div className="space-y-8 text-right" dir="rtl">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3 text-[var(--secondary-400)]">
            <TrendingUp className="w-8 h-8" />
            نظرة عامة
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mt-1">
            ملخص سريع — للتفاصيل انتقل إلى تبويب الإحصائيات.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="إجمالي المشاركين" value={analytics?.overview?.totalStudents ?? 0} />
          <StatCard label="عدد الكتب المنجزة" value={analytics?.overview?.totalBooksCompleted ?? 0} />
          <StatCard
            label="متوسط الإنجاز المرحلي"
            value={`${analytics?.overview?.avgStageCompletionRate ?? analytics?.overview?.avgCompletionRate ?? 0}%`}
            valueClassName="text-[var(--secondary-400)]"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[var(--secondary-400)]" />
                  فرسان الانضباط
                </h3>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {discipline.length === 0 ? (
                  <p className="p-4 text-sm text-center text-[var(--text-secondary)]">لا توجد بيانات</p>
                ) : (
                  discipline.map((user: any, i: number) => (
                    <div key={user.id} className="flex justify-between items-center py-4 px-6">
                      <span className="font-medium">
                        {i + 1}. {user.name}
                      </span>
                      <span className="text-[var(--secondary-400)] font-bold">{user.commitmentIndex}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Star className="w-5 h-5 text-[var(--secondary-400)]" />
                  نخبة القراء
                </h3>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {elite.length === 0 ? (
                  <p className="p-4 text-sm text-center text-[var(--text-secondary)]">لا توجد بيانات</p>
                ) : (
                  elite.map((user: any, i: number) => (
                    <div key={user.id} className="flex justify-between items-center py-4 px-6">
                      <span className="font-medium">
                        {i + 1}. {user.name}
                      </span>
                      <span className="text-[var(--secondary-400)] font-bold">{user.gamificationPages} صفحة</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-lg font-semibold">تفاصيل الدفعات</h3>
          </div>
          <Table>
            <TableHeader className="bg-[var(--bg-secondary)]">
              <TableRow>
                <TableHead className="text-right">الدفعة</TableHead>
                <TableHead className="text-center">المشاركون</TableHead>
                <TableHead className="text-center">صفحات التحفيز</TableHead>
                <TableHead className="text-right w-[240px]">متوسط الإنجاز</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.batchStats?.map((batch: any) => (
                <TableRow key={batch.batchId}>
                  <TableCell className="font-semibold">{batch.batchName}</TableCell>
                  <TableCell className="text-center">{batch.studentCount}</TableCell>
                  <TableCell className="text-center">{batch.totalPages?.toLocaleString() ?? 0}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={batch.avgCompletionRate} className="h-2 flex-1" />
                      <span className="text-xs">{batch.avgCompletionRate}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminLayout>
  );
}
