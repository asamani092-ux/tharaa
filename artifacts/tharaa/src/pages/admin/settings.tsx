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
  
  const [weeklyQuota, setWeeklyQuota] = useState(75);
  const [allDaysActive, setAllDaysActive] = useState(false);

  useEffect(() => {
    if (settings) {
      setWeeklyQuota(settings.weeklyQuota || 75);
      setAllDaysActive(!!settings.allDaysActive);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      data: {
        weeklyQuota,
        allDaysActive: allDaysActive ? 1 : 0
      }
    }, {
      onSuccess: () => toast.success("تم حفظ الإعدادات بنجاح")
    });
  };

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6 text-right" dir="rtl">
        <h2 className="text-2xl font-bold text-[#D4AF37] flex items-center gap-2">
          <Settings className="w-6 h-6" /> إعدادات المنصة
        </h2>

        <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl">
          <CardHeader className="border-b border-white/5"><CardTitle className="text-lg">إعدادات الرصد الأسبوعي</CardTitle></CardHeader>
          <CardContent className="pt-6 space-y-8">
            
            {/* إصلاح 6.1: حقل النصاب الأسبوعي */}
            <div className="space-y-3">
              <Label className="text-base">نصاب القراءة الأسبوعي (صفحة)</Label>
              <div className="flex items-center gap-4">
                <Input 
                  type="number" 
                  value={weeklyQuota} 
                  onChange={(e) => setWeeklyQuota(parseInt(e.target.value) || 0)} 
                  className="max-w-[200px] h-12 rounded-xl text-center text-xl font-bold"
                />
                <p className="text-muted-foreground text-sm">سيظهر هذا الرقم لكل الطلاب كنصاب افتراضي.</p>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            {/* تحسين 6.2: زر تفعيل التسليم */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="space-y-1">
                <Label className="text-base flex items-center gap-2">تفعيل الرصد طوال الأسبوع <Calendar className="w-4 h-4 text-primary"/></Label>
                <p className="text-sm text-muted-foreground">عند تفعيل هذا الخيار، سيتمكن الطلاب من تسجيل قراءاتهم في أي يوم من أيام الأسبوع.</p>
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
              {updateSettings.isPending ? <Loader2 className="animate-spin" /> : <><Save className="w-5 h-5" /> حفظ كافة الإعدادات</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
