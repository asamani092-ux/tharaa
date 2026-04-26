import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import bgPath from "@assets/لقطة_شاشة_2026-03-23_233921_1774925020030.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const login = useLogin();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    let normalizedPhone = phone.trim();
    if (normalizedPhone.startsWith("+966")) {
      normalizedPhone = "0" + normalizedPhone.slice(4);
    } else if (normalizedPhone.startsWith("966") && normalizedPhone.length === 12) {
      normalizedPhone = "0" + normalizedPhone.slice(3);
    }
    if (!normalizedPhone.startsWith("0") && normalizedPhone.length === 9) {
      normalizedPhone = "0" + normalizedPhone;
    }

    login.mutate(
      { data: { phone: normalizedPhone, password } },
      {
        onSuccess: async (res) => {
          toast.success("تم تسجيل الدخول بنجاح");
          await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          
          if (res.role === "admin") {
            window.location.href = "/admin"; 
          } else {
            window.location.href = "/student";
          }
        },
        onError: () => {
          toast.error("رقم الهاتف أو كلمة المرور غير صحيحة");
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" dir="rtl" style={{ backgroundColor: 'hsl(218,47%,8%)' }}>
      {/* الخلفية */}
      <div className="absolute inset-0 z-0">
        <img src={bgPath} alt="" className="w-full h-full object-cover" style={{ opacity: 0.08 }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, hsl(218,47%,6%) 0%, hsl(218,47%,10%) 100%)' }} />
      </div>

      {/* الهوية النصية الكبيرة في الخلفية */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span className="text-[25vw] font-black select-none" style={{ color: 'hsl(46,65%,52%)', opacity: 0.03, fontFamily: 'Cairo, sans-serif' }}>ثراء</span>
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="flex flex-col items-center mb-10">
          {/* تم حذف الشعار بناءً على الطلب */}
          <h2 className="text-2xl font-black mb-2" style={{ color: 'hsl(46,65%,52%)', fontFamily: 'Cairo, sans-serif' }}>ثراء المعرفة</h2>
          <p className="text-muted-foreground text-sm text-center">أهلاً بك    </p>
        </div>

        <div className="rounded-2xl p-8 shadow-2xl" style={{ backgroundColor: 'hsl(218,39%,12%)', border: '1px solid hsl(217,36%,20%)' }}>
          <h1 className="text-xl font-bold text-center mb-8 text-foreground" style={{ fontFamily: 'Cairo, sans-serif' }}>تسجيل الدخول</h1>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground mr-1">رقم الهاتف</Label>
              <Input
                id="phone"
                type="tel"
                dir="ltr"
                className="text-right h-12 rounded-xl focus:ring-primary/20"
                placeholder="05XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={login.isPending}
                style={{ backgroundColor: 'hsl(217,36%,16%)', border: '1px solid hsl(217,36%,24%)' }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground mr-1">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                className="h-12 rounded-xl focus:ring-primary/20"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={login.isPending}
                style={{ backgroundColor: 'hsl(217,36%,16%)', border: '1px solid hsl(217,36%,24%)' }}
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 font-bold text-base rounded-xl mt-4 bg-primary hover:bg-primary/90 transition-all shadow-lg shadow-primary/10"
              disabled={login.isPending}
            >
              {login.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "دخول للنظام"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
