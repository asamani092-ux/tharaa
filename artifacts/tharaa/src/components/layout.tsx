import { Link, useLocation } from "wouter";
import { useLogout, useGetMe } from "@workspace/api-client-react";
import { LogOut, BookOpen, Users, BarChart3, Settings, Layers } from "lucide-react";
import logoPath from "@assets/لقطة_شاشة_2026-03-24_055723_1774925020035.png";
import { Button } from "@/components/ui/button";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const logout = useLogout();
  const { data: session } = useGetMe();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      }
    });
  };

  const navItems = [
    { href: "/admin", label: "نظرة عامة", icon: BarChart3, id: "overview" },
    { href: "/admin/users", label: "إدارة المستخدمين", icon: Users, id: "users" },
    { href: "/admin/curriculum", label: "المنهج الدراسي", icon: BookOpen, id: "curriculum" },
    { href: "/admin/batches", label: "الدفعات", icon: Layers, id: "batches" },
    { href: "/admin/analytics", label: "التحليلات", icon: BarChart3, id: "analytics" },
    { href: "/admin/settings", label: "الإعدادات", icon: Settings, id: "settings" },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-card border-l border-border flex flex-col">
        <div className="p-6 border-b border-border flex justify-center">
          <img src={logoPath} alt="ثراء المعرفة" className="h-16 object-contain" />
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                data-testid={`link-admin-${item.id}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-md cursor-pointer transition-colors ${
                  location === item.href || (location.startsWith(item.href) && item.href !== "/admin")
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="mb-4 px-2 text-sm text-muted-foreground" data-testid="text-username">
            {session?.user?.name}
          </div>
          <Button data-testid="button-logout" variant="outline" className="w-full justify-start gap-2" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const logout = useLogout();
  const { data: session } = useGetMe();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.href = "/login";
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src={logoPath} alt="ثراء المعرفة" className="h-12 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-primary">ثراء المعرفة</h1>
              <p className="text-sm text-muted-foreground">بوابة الطالب</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium" data-testid="text-username">{session?.user?.name}</span>
            <Button data-testid="button-logout" variant="outline" size="sm" className="gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              خروج
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
