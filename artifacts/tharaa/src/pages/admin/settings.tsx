import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings, Save, Loader2, Calendar } from "lucide-react";

export default function AdminSettings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  
  const [weeklyQuota, setWeeklyQuota] = useState<string>("75");
  const [allDaysActive, setAllDaysActive] = useState<boolean>(false);

  useEffect(() => {
    if (settings) {
      setWeeklyQuota(settings.weeklyQuota ? settings.weeklyQuota.toString() : "75");
      setAllDaysActive(!!settings.allDaysActive);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      data: {
        weeklyQuota: parseInt(weeklyQuota) || 75,
        allDaysActive: allDaysActive ? 1 : 0
      }
    }, {
      onSuccess: () => toast.success("تم حفظ الإعدادات بنجاح"),
      onError: () => toast.error("حدث خطأ أثناء حفظ الإعدادات")
    });
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6 text-right" dir="rtl">
        <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#D4AF37', fontFamily: 'Cairo, sans-serif' }}>
          <Settings className="w-6 h-6" /> إعدادات المنصة
        </h2>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-lg" style={{ fontFamily: 'Cairo, sans-serif' }}>إعدادات الرصد الأسبوعي</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-8">
              
              <div className="space-y-3">
                <Label className="text-base text-[#94a3b8]">نصاب القراءة الأسبوعي (صفحة)</Label>
                <div className="flex items-center gap-4">
                  <Input 
                    type="number" 
                    min="1"
                    value={weeklyQuota} 
                    onChange={(e) => setWeeklyQuota(e.target.value)} 
                    className="max-w-[200px] h-12 rounded-xl text-center text-xl font-bold bg-[#161e2f] border-[#1e293b]"
                  />
                  <p className="text-muted-foreground text-sm">سيظهر هذا الرقم لكل الطلاب كنصاب افتراضي مطلوب إنجازه.</p>
                </div>
              </div>

              <div className="h-px bg-white/5" />

              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="space-y-1 text-right">
                  <Label className="text-base flex items-center gap-2 justify-end">
                    تفعيل الرصد طوال الأسبوع <Calendar className="w-4 h-4 text-primary"/>
                  </Label>
                  <p className="text-sm text-muted-foreground">عند تفعيل هذا الخيار، سيتمكن المشاركون من تسجيل قراءاتهم في أي يوم.</p>
                </div>
                <Switch 
                  checked={allDaysActive} 
                  onCheckedChange={setAllDaysActive} 
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>

              <Button 
                onClick={handleSave} 
                className="w-full h-12 rounded-xl font-bold text-lg gap-2"
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : <><Save className="w-5 h-5" /> حفظ كافة الإعدادات</>}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
