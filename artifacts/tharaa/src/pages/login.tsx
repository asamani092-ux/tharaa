import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import bgPath from "@assets/لقطة_شاشة_2026-03-23_233921_1774925020030.png";
import logoPath from "@assets/لقطة_شاشة_2026-03-23_233921_1774925020030.png";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { toast } from "sonner";
import { Phone, Lock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

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
        onError: (error: any) => {
          const serverMessage =
            error?.response?.data?.error || error?.info?.error || error?.message;
          toast.error(serverMessage || "تأكد من صحة البيانات أو تواصل مع الإدارة");
        },
      }
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background text-foreground transition-colors duration-300 font-sans"
      dir="rtl"
    >
      {/* زر تبديل الثيم */}
      <div className="absolute top-6 left-6 z-50">
        <ThemeToggle />
      </div>

      {/* خلفية كحلية + طبقة تعتيم + نقش الشعار */}
      <div className="absolute inset-0 z-0">
        <img
          src={bgPath}
          alt=""
          className="w-full h-full object-cover opacity-10"
        />
        <div className="absolute inset-0 bg-background/90" />
      </div>

      <div
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.05] flex items-center justify-center"
        style={{
          backgroundImage: `url(${logoPath})`,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "70%",
        }}
      />

      {/* محتوى النموذج */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="flex flex-col items-center mb-8 text-center">
          <h1 className="text-[var(--font-3xl)] font-bold text-[var(--secondary-400)] mb-1">
            ثراء المعرفة
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            بوابة الوصول إلى منصتك المعرفية
          </p>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-[var(--font-xl)] font-semibold">
              تسجيل الدخول
            </CardTitle>
            <CardDescription>أهلاً بك مجدداً في منصتك المعرفية</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-[var(--text-primary)]">
                  رقم الهاتف
                </Label>
                <div className="relative">
                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] opacity-70 pointer-events-none" />
                  <Input
                    id="phone"
                    type="tel"
                    dir="ltr"
                    className="pr-11 text-[var(--font-md)]"
                    placeholder="05XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={login.isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-[var(--text-primary)]">
                  كلمة المرور
                </Label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] opacity-70 pointer-events-none" />
                  <Input
                    id="password"
                    type="password"
                    dir="ltr"
                    className="pr-11 text-[var(--font-md)]"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={login.isPending}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full mt-2 h-11 text-[var(--font-md)] font-medium"
                isLoading={login.isPending}
              >
                دخول للنظام
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
