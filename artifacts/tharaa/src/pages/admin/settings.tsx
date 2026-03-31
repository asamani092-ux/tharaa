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

  if (isLoading) return <AdminLayout><div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">إعدادات النظام</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>القراءة الأسبوعية</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-sm">
                <Label>نصاب القراءة الأسبوعي (عدد الصفحات)</Label>
                <Input data-testid="input-weekly-quota" type="number" value={formData.weeklyQuota || 0} onChange={e => setFormData({...formData, weeklyQuota: e.target.value})} required />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>أوقات التسليم (الأوراد)</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md border-border">
                <div className="col-span-full font-semibold text-primary">بداية وقت التسليم</div>
                <div className="space-y-2">
                  <Label>اليوم</Label>
                  <Select value={formData.submissionStartDay?.toString()} onValueChange={v => setFormData({...formData, submissionStartDay: v})}>
                    <SelectTrigger data-testid="select-start-day"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={`start-${d.value}`} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الساعة</Label>
                  <Select value={formData.submissionStartHour?.toString()} onValueChange={v => setFormData({...formData, submissionStartHour: v})}>
                    <SelectTrigger data-testid="select-start-hour"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.map(h => <SelectItem key={`start-h-${h.value}`} value={h.value}>{h.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md border-border">
                <div className="col-span-full font-semibold text-green-500">نهاية وقت التسليم الطبيعي (الدرجة الكاملة)</div>
                <div className="space-y-2">
                  <Label>اليوم</Label>
                  <Select value={formData.normalDeadlineDay?.toString()} onValueChange={v => setFormData({...formData, normalDeadlineDay: v})}>
                    <SelectTrigger data-testid="select-normal-day"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={`norm-${d.value}`} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الساعة</Label>
                  <Select value={formData.normalDeadlineHour?.toString()} onValueChange={v => setFormData({...formData, normalDeadlineHour: v})}>
                    <SelectTrigger data-testid="select-normal-hour"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.map(h => <SelectItem key={`norm-h-${h.value}`} value={h.value}>{h.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-md border-border">
                <div className="col-span-full font-semibold text-orange-500">نهاية وقت التسليم المتأخر (تخصم درجات)</div>
                <div className="space-y-2">
                  <Label>اليوم</Label>
                  <Select value={formData.lateDeadlineDay?.toString()} onValueChange={v => setFormData({...formData, lateDeadlineDay: v})}>
                    <SelectTrigger data-testid="select-late-day"><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map(d => <SelectItem key={`late-${d.value}`} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الساعة</Label>
                  <Select value={formData.lateDeadlineHour?.toString()} onValueChange={v => setFormData({...formData, lateDeadlineHour: v})}>
                    <SelectTrigger data-testid="select-late-hour"><SelectValue /></SelectTrigger>
                    <SelectContent>{HOURS.map(h => <SelectItem key={`late-h-${h.value}`} value={h.value}>{h.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>عتبات التقييم (نسبة مئوية للالتزام)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>امتياز (%)</Label>
                <Input data-testid="input-grade-excellent" type="number" value={formData.gradeThresholdExcellent || 0} onChange={e => setFormData({...formData, gradeThresholdExcellent: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>جيد جداً (%)</Label>
                <Input data-testid="input-grade-good" type="number" value={formData.gradeThresholdGood || 0} onChange={e => setFormData({...formData, gradeThresholdGood: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>مقبول (%)</Label>
                <Input data-testid="input-grade-acceptable" type="number" value={formData.gradeThresholdAcceptable || 0} onChange={e => setFormData({...formData, gradeThresholdAcceptable: e.target.value})} required />
              </div>
            </CardContent>
          </Card>

          <Button data-testid="button-save-settings" type="submit" size="lg" className="w-full md:w-auto gap-2" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            حفظ الإعدادات
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
}
