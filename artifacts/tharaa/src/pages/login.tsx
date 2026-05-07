import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import bgPath from "@assets/لقطة_شاشة_2026-03-23_233921_1774925020030.png";
import logoPath from "@assets/لقطة_شاشة_2026-03-23_233921_1774925020030.png"; 
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Phone, Lock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Login() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const login = useLogin();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🌟 معالجة رقم الجوال الذكية (باقية كما برمجتها)
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
          // 🌟 استخراج رسالة السيرفر الدقيقة بذكاء
          const serverMessage = error?.response?.data?.error || error?.info?.error || error?.message;
          toast.error(serverMessage || "تأكد من صحة البيانات أو تواصل مع الإدارة");
        }
      }
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background text-foreground transition-colors duration-500" dir="rtl">
      
      {/* 🌟 زر التبديل للثيم (أضفناه هنا في الزاوية العلوية) */}
      <div className="absolute top-6 left-6 z-50">
        <ThemeToggle />
      </div>

      {/* 1. طبقة النقوش الخلفية المدمجة مع النظام */}
      <div className="absolute inset-0 z-0">
        <img src={bgPath} alt="" className="w-full h-full object-cover opacity-5" />
        <div className="absolute inset-0 bg-background/90" />
        {/* تأثيرات الإضاءة الخلفية المستوحاة من نظام التصميم */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 pointer-events-none bg-[var(--secondary-400)]"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-20 pointer-events-none bg-[var(--primary-400)]"></div>
      </div>

      {/* 2. الشعار كخلفية شفافة */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-[0.03]" 
        style={{
          backgroundImage: `url(${logoPath})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '80%',
          maxWidth: '600px',
          margin: 'auto'
        }}
      />

      {/* محتوى الدخول */}
      <div className="relative z-10 w-full max-w-md mx-4">
        
        {/* العناوين بالخط الجديد */}
        <div className="flex flex-col items-center mb-10">
          <h2 className="text-4xl font-bold mb-2 text-[hsl(var(--primary))]" style={{ textShadow: '0px 2px 10px rgba(202, 162, 100, 0.2)', letterSpacing: '1px' }}>
            ثراء المعرفة
          </h2>
          <p className="text-[var(--text-secondary)] text-sm text-center">
            أهلاً بك مجدداً في منصتك المعرفية
          </p>
        </div>

        {/* 🌟 استخدام مكون البطاقة الجديد (.ds-card) */}
        <div className="ds-card w-full">
          <div className="p-8 space-y-6">
            <h1 className="text-2xl font-bold text-center mb-4 text-[var(--text-primary)]">تسجيل الدخول</h1>

            <form onSubmit={handleLogin} className="space-y-6">
              
              {/* حقل رقم الجوال مع تصميم .ds-input */}
              <div className="space-y-2 relative">
                <Label className="text-[var(--text-primary)] font-medium ml-1">رقم الهاتف</Label>
                <div className="relative">
                  <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 text-[var(--text-secondary)] pointer-events-none" />
                  <input
                    id="phone"
                    type="tel"
                    dir="ltr"
                    className="ds-input pr-12 text-lg font-mono placeholder-[var(--text-secondary)]/50"
                    placeholder="05XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={login.isPending}
                  />
                </div>
              </div>

              {/* حقل كلمة المرور مع تصميم .ds-input */}
              <div className="space-y-2 relative">
                <Label className="text-[var(--text-primary)] font-medium ml-1">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 text-[var(--text-secondary)] pointer-events-none" />
                  <input
                    id="password"
                    type="password"
                    dir="ltr"
                    className="ds-input pr-12 text-lg placeholder-[var(--text-secondary)]/50"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={login.isPending}
                  />
                </div>
              </div>

              {/* 🌟 استخدام زر النظام الأساسي (.ds-btn) */}
              <button
                type="submit"
                className="ds-btn ds-btn-primary w-full mt-4"
                disabled={login.isPending}
              >
                {login.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : "دخول للنظام"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
