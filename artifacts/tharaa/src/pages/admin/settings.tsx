import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";

const DAYS = [
  { value: "0", label: "الأحد" },
  { value: "1", label: "الإثنين" },
  { value: "2", label: "الثلاثاء" },
  { value: "3", label: "الأربعاء" },
  { value: "4", label: "الخميس" },
  { value: "5", label: "الجمعة" },
  { value: "6", label: "السبت" }
];

const HOURS = Array.from({ length: 24 }, (_, i) => ({
  value: i.toString(),
  label: `${i.toString().padStart(2, '0')}:00`
}));

const cardStyle = { backgroundColor: 'hsl(218,39%,12%)', borderColor: 'hsl(217,36%,20%)' };
const sectionStyle = { border: '1px solid hsl(217,36%,22%)', borderRadius: '0.75rem', padding: '1rem', backgroundColor: 'hsl(218,47%,9%)' };

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();

  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSubmit = {
      weeklyQuota: Number(formData.weeklyQuota),
      submissionStartDay: Number(formData.submissionStartDay),
      submissionStartHour: Number(formData.submissionStartHour),
      normalDeadlineDay: Number(formData.normalDeadlineDay),
      normalDeadlineHour: Number(formData.normalDeadlineHour),
      lateDeadlineDay: Number(formData.lateDeadlineDay),
      lateDeadlineHour: Number(formData.lateDeadlineHour),
      gradeThresholdExcellent: Number(formData.gradeThresholdExcellent),
      gradeThresholdGood: Number(formData.gradeThresholdGood),
      gradeThresholdAcceptable: Number(formData.gradeThresholdAcceptable),
    };

    updateSettings.mutate({ data: dataToSubmit }, {
      onSuccess: () => {
        toast.success("تم حفظ الإعدادات بنجاح");
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: () => toast.error("حدث خطأ أثناء الحفظ")
    });
  };

  if (isLoading) {
    return <AdminLayout><div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div></AdminLayout>;
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <h2 className="text-2xl font-bold" style={{ fontFamily: 'Cairo, sans-serif' }}>إعدادات النظام</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Weekly quota */}
          <Card className="rounded-xl border" style={cardStyle}>
            <CardHeader style={{ borderBottom: '1px solid hsl(217,36%,18%)' }}>
              <CardTitle className="text-base" style={{ fontFamily: 'Cairo, sans-serif' }}>القراءة الأسبوعية</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="space-y-1.5 max-w-xs">
                <Label className="text-sm text-muted-foreground">نصاب القراءة الأسبوعي (عدد الصفحات)</Label>
                <Input
                  data-testid="input-weekly-quota"
                  type="number"
                  value={formData.weeklyQuota || 0}
                  onChange={e => setFormData({...formData, weeklyQuota: e.target.value})}
                  required
                  className="rounded-xl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Submission windows */}
          <Card className="rounded-xl border" style={cardStyle}>
            <CardHeader style={{ borderBottom: '1px solid hsl(217,36%,18%)' }}>
              <CardTitle className="text-base" style={{ fontFamily: 'Cairo, sans-serif' }}>أوقات التسليم</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              {[
                { label: "بداية وقت التسليم", color: "text-muted-foreground", dayKey: "submissionStartDay", hourKey: "submissionStartHour", testDay: "select-start-day", testHour: "select-start-hour" },
                { label: "نهاية التسليم الطبيعي (بدون خصم)", color: "text-emerald-400", dayKey: "normalDeadlineDay", hourKey: "normalDeadlineHour", testDay: "select-normal-day", testHour: "select-normal-hour" },
                { label: "نهاية التسليم المتأخر (تخصم درجات)", color: "text-orange-400", dayKey: "lateDeadlineDay", hourKey: "lateDeadlineHour", testDay: "select-late-day", testHour: "select-late-hour" },
              ].map(section => (
                <div key={section.dayKey} style={sectionStyle}>
                  <p className={`text-sm font-semibold mb-3 ${section.color}`}>{section.label}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">اليوم</Label>
                      <Select value={formData[section.dayKey]?.toString()} onValueChange={v => setFormData({...formData, [section.dayKey]: v})}>
                        <SelectTrigger data-testid={section.testDay} className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>{DAYS.map(d => <SelectItem key={`${section.dayKey}-${d.value}`} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">الساعة</Label>
                      <Select value={formData[section.hourKey]?.toString()} onValueChange={v => setFormData({...formData, [section.hourKey]: v})}>
                        <SelectTrigger data-testid={section.testHour} className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>{HOURS.map(h => <SelectItem key={`${section.hourKey}-${h.value}`} value={h.value}>{h.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Grade thresholds */}
          <Card className="rounded-xl border" style={cardStyle}>
            <CardHeader style={{ borderBottom: '1px solid hsl(217,36%,18%)' }}>
              <CardTitle className="text-base" style={{ fontFamily: 'Cairo, sans-serif' }}>عتبات التقييم (نسبة الالتزام %)</CardTitle>
            </CardHeader>
            <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "امتياز (%)", key: "gradeThresholdExcellent", testid: "input-grade-excellent" },
                { label: "جيد جداً (%)", key: "gradeThresholdGood", testid: "input-grade-good" },
                { label: "مقبول (%)", key: "gradeThresholdAcceptable", testid: "input-grade-acceptable" },
              ].map(g => (
                <div key={g.key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{g.label}</Label>
                  <Input
                    data-testid={g.testid}
                    type="number"
                    value={formData[g.key] || 0}
                    onChange={e => setFormData({...formData, [g.key]: e.target.value})}
                    required
                    className="rounded-xl"
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Button data-testid="button-save-settings" type="submit" className="gap-2 rounded-xl" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ الإعدادات
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
}
