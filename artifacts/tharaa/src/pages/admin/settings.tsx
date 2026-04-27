import { useState, useEffect } from "react";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  Settings, 
  Save, 
  Loader2, 
  Calendar, 
  BookOpen, 
  ShieldCheck, 
  Palette,
  BellRing
} from "lucide-react";

export default function AdminSettings() {
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  
  // الحالات الخاصة بالإعدادات
  const [weeklyQuota, setWeeklyQuota] = useState<string>("75");
  const [allDaysActive, setAllDaysActive] = useState<boolean>(false);
  const [platformName, setPlatformName] = useState<string>("ثراء المعرفة");
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);

  // تحديث الحالات عند تحميل البيانات من السيرفر
  useEffect(() => {
    if (settings) {
      setWeeklyQuota(settings.weeklyQuota ? settings.weeklyQuota.toString() : "75");
      setAllDaysActive(!!settings.allDaysActive);
      // إذا كانت هناك حقول أخرى في قاعدة البيانات ستضاف هنا
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      data: {
        weeklyQuota: parseInt(weeklyQuota) || 75,
        allDaysActive: allDaysActive ? 1 : 0,
        // أضف أي حقول إضافية يدعمها السيرفر هنا
      }
    }, {
      onSuccess: () => toast.success("تم حفظ جميع التغييرات بنجاح ✅"),
      onError: () => toast.error("فشل حفظ الإعدادات، يرجى المحاولة لاحقاً")
    });
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-8 text-right pb-10" dir="rtl">
        
        {/* العناوين الرئيسية */}
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-bold flex items-center gap-3" style={{ color: '#D4AF37', fontFamily: 'Cairo, sans-serif' }}>
            <Settings className="w-8 h-8" /> إعدادات النظام المتقدمة
          </h2>
          <p className="text-muted-foreground mr-11">التحكم في معايير القراءة، صلاحيات التسجيل، وهوية المنصة.</p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37]" />
            <p className="text-muted-foreground animate-pulse">جاري تحميل إعدادات المنصة...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* 1. إعدادات القراءة (تم حل مشكلة الكتابة 6.1) */}
            <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl overflow-hidden border-t-4 border-t-[#D4AF37]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-[#D4AF37]" />
                  <CardTitle className="text-lg">معايير القراءة</CardTitle>
                </div>
                <CardDescription>تحديد الأهداف الأسبوعية المطلوبة من الطلاب</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm text-[#94a3b8]">نصاب القراءة الأسبوعي (عدد الصفحات)</Label>
                  <Input 
                    type="number" 
                    min="1"
                    value={weeklyQuota} 
                    // التعديل هنا: استخدام onChange لتحديث الحالة فوراً لتمكين الكتابة
                    onChange={(e) => setWeeklyQuota(e.target.value)} 
                    className="h-12 rounded-xl text-center text-xl font-bold bg-[#161e2f] border-[#1e293b] focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                  />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    * هذا الرقم هو المستهدف الذي سيظهر في لوحة الطالب وعليه تُحسب نسبة التزامه.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 2. صلاحيات التسجيل (تحسين مظهر الزر 6.2) */}
            <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl border-t-4 border-t-emerald-500/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-emerald-400" />
                  <CardTitle className="text-lg">مواعيد الرصد</CardTitle>
                </div>
                <CardDescription>التحكم في متى يسمح للطلاب بتسجيل الإنجاز</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setAllDaysActive(!allDaysActive)}>
                  <div className="space-y-1">
                    <Label className="text-sm font-bold block">تفعيل الرصد طوال الأسبوع</Label>
                    <p className="text-[11px] text-muted-foreground">فتح النظام 24/7 بدلاً من عطلة نهاية الأسبوع فقط.</p>
                  </div>
                  <Switch 
                    checked={allDaysActive} 
                    onCheckedChange={setAllDaysActive} 
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 opacity-50 select-none">
                  <div className="space-y-1">
                    <Label className="text-sm font-bold block flex items-center gap-2">تنبيهات التسليم المتأخر <BellRing className="w-3 h-3"/></Label>
                    <p className="text-[11px] text-muted-foreground">إرسال تنبيهات تلقائية لمن لم يكمل النصاب.</p>
                  </div>
                  <Switch checked={false} disabled />
                </div>
              </CardContent>
            </Card>

            {/* 3. هوية المنصة (إضافات جمالية) */}
            <Card className="bg-[#0f172a] border-[#1e293b] rounded-2xl shadow-xl md:col-span-2 border-t-4 border-t-blue-500/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-blue-400" />
                  <CardTitle className="text-lg">الهوية البصرية والأمان</CardTitle>
                </div>
                <CardDescription>تخصيص مظهر المنصة وإعدادات الوصول</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-sm text-[#94a3b8]">اسم المنصة الظاهر</Label>
                  <Input 
                    value={platformName} 
                    onChange={(e) => setPlatformName(e.target.value)}
                    className="h-11 rounded-xl bg-[#161e2f] border-[#1e293b]"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/10">
                  <div className="space-y-1">
                    <Label className="text-sm font-bold block flex items-center gap-2 text-red-400">وضع الصيانة <ShieldCheck className="w-4 h-4"/></Label>
                    <p className="text-[11px] text-muted-foreground text-red-300/70">إغلاق المنصة مؤقتاً عن الطلاب لإجراء تحديثات.</p>
                  </div>
                  <Switch 
                    checked={isMaintenanceMode} 
                    onCheckedChange={setIsMaintenanceMode} 
                    className="data-[state=checked]:bg-red-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* زر الحفظ النهائي */}
            <div className="md:col-span-2 pt-4">
              <Button 
                onClick={handleSave} 
                className="w-full h-14 rounded-2xl font-bold text-xl gap-3 shadow-2xl transition-all hover:scale-[1.01] active:scale-[0.99] bg-[#D4AF37] hover:bg-[#D4AF37]/90 text-black"
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? (
                  <Loader2 className="animate-spin w-6 h-6" />
                ) : (
                  <>
                    <Save className="w-6 h-6" /> 
                    حفظ كافة الإعدادات وتطبيقها
                  </>
                )}
              </Button>
            </div>

          </div>
        )}
      </div>
    </AdminLayout>
  );
}
