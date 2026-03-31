import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import bgPath from "@assets/لقطة_شاشة_2026-03-23_233921_1774925020030.png";
import logoPath from "@assets/لقطة_شاشة_2026-03-24_055723_1774925020035.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let normalizedPhone = phone.trim();
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = normalizedPhone.substring(1);
    }
    
    login.mutate(
      { data: { phone: normalizedPhone, password } },
      {
        onSuccess: (res) => {
          toast.success("تم تسجيل الدخول بنجاح");
          if (res.role === "admin") {
            setLocation("/admin");
          } else {
            setLocation("/student");
          }
        },
        onError: () => {
          toast.error("رقم الهاتف أو كلمة المرور غير صحيحة");
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img src={bgPath} alt="Background" className="w-full h-full object-cover opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm"></div>
      </div>

      <div className="relative z-10 w-full max-w-md p-8 bg-card border border-border rounded-xl shadow-2xl">
        <div className="flex flex-col items-center mb-8">
          <img src={logoPath} alt="ثراء المعرفة" className="h-24 mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-primary">تسجيل الدخول</h1>
          <p className="text-muted-foreground mt-2 text-center">أهلاً بك في منصة ثراء المعرفة للقراءة</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input
              id="phone"
              data-testid="input-phone"
              type="tel"
              dir="ltr"
              className="text-right"
              placeholder="05XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              disabled={login.isPending}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              data-testid="input-password"
              type="password"
              dir="ltr"
              className="text-right"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={login.isPending}
            />
          </div>

          <Button data-testid="button-login" type="submit" className="w-full font-bold text-lg h-12" disabled={login.isPending}>
            {login.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "دخول"}
          </Button>
        </form>
      </div>
    </div>
  );
}
