import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Users, BookCheck, Award, TrendingUp, Star, Trophy, Loader2 } from "lucide-react";

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
    queryKey: ["admin-analytics-overview-direct"],
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
          <p className="text-[var(--text-secondary)] animate-pulse">جاري تحميل نظرة عامة...</p>
        </div>
      </AdminLayout>
    );
  }

  const topReaders = [...(analytics?.usersDetail ?? [])]
    .sort((a: any, b: any) => b.totalReadPages - a.totalReadPages)
    .slice(0, 5);

  return (
    <AdminLayout>
      <div className="space-y-8 text-right" dir="rtl">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold flex items-center gap-3 text-[var(--secondary-400)]">
            <TrendingUp className="w-8 h-8" />
            نظرة عامة
          </h2>
          <p className="text-[var(--text-secondary)] text-sm">
            ملخص سريع للأداء — للتفاصيل الكاملة انتقل إلى تبويب الإحصائيات.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="إجمالي المشاركين" value={analytics?.overview?.totalStudents ?? 0} />
          <StatCard label="عدد الكتب المنجزة" value={analytics?.overview?.totalBooksCompleted ?? 0} />
          <StatCard
            label="نسبة الإنجاز العام"
            value={`${analytics?.overview?.avgCompletionRate ?? 0}%`}
            valueClassName="text-[var(--secondary-400)]"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                  <Trophy className="w-5 h-5 text-[var(--secondary-400)]" />
                  الأعلى قراءة (صفحات)
                </h3>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {topReaders.map((user: any, i: number) => (
                  <div
                    key={user.id}
                    className="flex justify-between items-center py-4 px-6 hover:bg-[var(--bg-tertiary)]"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0
                            ? "bg-[hsl(var(--primary))] text-primary-foreground"
                            : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="font-medium text-[var(--text-primary)]">{user.name}</span>
                    </div>
                    <span className="text-[var(--secondary-400)] font-bold">{user.totalReadPages} صفحة</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
                  <Star className="w-5 h-5 text-[var(--secondary-400)]" />
                  الأكثر التزاماً بالرصد
                </h3>
              </div>
              <div className="divide-y divide-[var(--border-subtle)]">
                {analytics?.topCommitted?.map((user: any, i: number) => (
                  <div
                    key={i}
                    className="flex justify-between items-center py-4 px-6 hover:bg-[var(--bg-tertiary)]"
                  >
                    <span className="font-medium text-[var(--text-primary)]">{user.name}</span>
                    <span className="text-[var(--font-sm)] px-3 py-1 rounded-full border border-[var(--border-default)] text-[var(--text-secondary)]">
                      {user.logs_count} تسجيلات
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <div className="px-6 py-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-[var(--text-primary)]">
              <Users className="w-5 h-5 text-[var(--secondary-400)]" />
              تفاصيل إنجاز الدفعات
            </h3>
          </div>
          <Table>
            <TableHeader className="bg-[var(--bg-secondary)]">
              <TableRow className="border-[var(--border-default)] hover:bg-transparent">
                <TableHead className="text-right text-[var(--text-secondary)] font-semibold py-3 px-6">
                  اسم الدفعة
                </TableHead>
                <TableHead className="text-center text-[var(--text-secondary)] font-semibold">عدد المشاركين</TableHead>
                <TableHead className="text-center text-[var(--text-secondary)] font-semibold">إجمالي الصفحات</TableHead>
                <TableHead className="text-right text-[var(--text-secondary)] font-semibold px-6 w-[280px]">
                  نسبة متوسط الإنجاز
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics?.batchStats?.map((batch: any) => (
                <TableRow key={batch.batchId} className="border-[var(--border-subtle)] hover:bg-[var(--bg-tertiary)]">
                  <TableCell className="py-4 px-6 font-semibold text-[var(--text-primary)]">{batch.batchName}</TableCell>
                  <TableCell className="text-center text-[var(--text-primary)]">{batch.studentCount}</TableCell>
                  <TableCell className="text-center text-[var(--secondary-400)] font-medium">
                    {batch.totalPages?.toLocaleString() ?? 0}
                  </TableCell>
                  <TableCell className="px-6">
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--secondary-400)] font-medium">{batch.avgCompletionRate}%</span>
                        <span className="text-[var(--text-secondary)]">متوسط الإنجاز</span>
                      </div>
                      <Progress value={batch.avgCompletionRate} className="h-2" />
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
