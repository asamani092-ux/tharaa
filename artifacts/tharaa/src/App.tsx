import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import Login from "@/pages/login";
import StudentPortal from "@/pages/student/index";
import SubmitLog from "@/pages/student/submit";
import AdminDashboard from "@/pages/admin/index";
import AdminUsers from "@/pages/admin/users";
import AdminAnalytics from "@/pages/admin/analytics";
import AdminCurriculum from "@/pages/admin/curriculum";
import AdminSettings from "@/pages/admin/settings";
import AdminBatches from "@/pages/admin/batches";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AuthGuard({ children, requireRole }: { children: React.ReactNode, requireRole?: 'admin' | 'student' }) {
  const { data: session, isLoading } = useGetMe();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (!session?.authenticated) {
        if (location !== "/login") setLocation("/login");
      } else if (requireRole && session.user?.role !== requireRole) {
        setLocation(session.user?.role === "admin" ? "/admin" : "/student");
      } else if (location === "/") {
        setLocation(session.user?.role === "admin" ? "/admin" : "/student");
      }
    }
  }, [session, isLoading, location, requireRole, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!session?.authenticated && location !== "/login") {
    return null; // Will redirect
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <AuthGuard><Login /></AuthGuard>
      </Route>
      
      {/* Student Routes */}
      <Route path="/student">
        <AuthGuard requireRole="student"><StudentPortal /></AuthGuard>
      </Route>
      <Route path="/student/submit">
        <AuthGuard requireRole="student"><SubmitLog /></AuthGuard>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <AuthGuard requireRole="admin"><AdminDashboard /></AuthGuard>
      </Route>
      <Route path="/admin/users">
        <AuthGuard requireRole="admin"><AdminUsers /></AuthGuard>
      </Route>
      <Route path="/admin/analytics">
        <AuthGuard requireRole="admin"><AdminAnalytics /></AuthGuard>
      </Route>
      <Route path="/admin/curriculum">
        <AuthGuard requireRole="admin"><AdminCurriculum /></AuthGuard>
      </Route>
      <Route path="/admin/settings">
        <AuthGuard requireRole="admin"><AdminSettings /></AuthGuard>
      </Route>
      <Route path="/admin/batches">
        <AuthGuard requireRole="admin"><AdminBatches /></AuthGuard>
      </Route>

      {/* Root */}
      <Route path="/">
        <AuthGuard><div /></AuthGuard>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster position="top-center" dir="rtl" richColors theme="dark" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
