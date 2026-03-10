import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LiveChat } from "@/components/LiveChat";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import QuotePage from "@/pages/Quote";

// Admin pages
import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminServices from "@/pages/admin/Services";
import AdminCustomers from "@/pages/admin/Customers";
import AdminProjects from "@/pages/admin/Projects";
import AdminAnalytics from "@/pages/admin/Analytics";
import AdminMessages from "@/pages/admin/Messages";
import AdminQuotes from "@/pages/admin/Quotes";
import AdminInvoices from "@/pages/admin/Invoices";
import AdminLeads from "@/pages/admin/Leads";
import AdminConversations from "@/pages/admin/Conversations";
import AdminPayments from "@/pages/admin/Payments";

// Portal pages
import PortalDashboard from "@/pages/portal/Dashboard";
import PortalProjects from "@/pages/portal/Projects";
import PortalInvoices from "@/pages/portal/Invoices";
import PortalQuotes from "@/pages/portal/Quotes";

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Redirect to="/admin/login" />;
  if (user.role !== "admin") return <Redirect to="/portal" />;
  return <>{children}</>;
}

function ClientGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Redirect to="/login" />;
  return <>{children}</>;
}

function Router() {
  const { user, isLoading } = useAuth();

  // While session is being verified, show a spinner to prevent flashing login pages
  const spinner = <div className="min-h-screen flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <>
      <Switch>
        {/* Public */}
        <Route path="/" component={Home} />
        <Route path="/quote" component={QuotePage} />
        <Route path="/login">
          {isLoading ? spinner : user ? <Redirect to={user.role === "admin" ? "/admin" : "/portal"} /> : <Login />}
        </Route>
        <Route path="/admin/login">
          {isLoading ? spinner : user ? <Redirect to={user.role === "admin" ? "/admin" : "/portal"} /> : <AdminLogin />}
        </Route>

        {/* Admin */}
        <Route path="/admin">
          <AdminGuard><AdminDashboard /></AdminGuard>
        </Route>
        <Route path="/admin/services">
          <AdminGuard><AdminServices /></AdminGuard>
        </Route>
        <Route path="/admin/customers">
          <AdminGuard><AdminCustomers /></AdminGuard>
        </Route>
        <Route path="/admin/projects">
          <AdminGuard><AdminProjects /></AdminGuard>
        </Route>
        <Route path="/admin/leads">
          <AdminGuard><AdminLeads /></AdminGuard>
        </Route>
        <Route path="/admin/analytics">
          <AdminGuard><AdminAnalytics /></AdminGuard>
        </Route>
        <Route path="/admin/messages">
          <AdminGuard><AdminMessages /></AdminGuard>
        </Route>
        <Route path="/admin/quotes">
          <AdminGuard><AdminQuotes /></AdminGuard>
        </Route>
        <Route path="/admin/invoices">
          <AdminGuard><AdminInvoices /></AdminGuard>
        </Route>
        <Route path="/admin/conversations">
          <AdminGuard><AdminConversations /></AdminGuard>
        </Route>
        <Route path="/admin/payments">
          <AdminGuard><AdminPayments /></AdminGuard>
        </Route>

        {/* Client Portal */}
        <Route path="/portal">
          <ClientGuard><PortalDashboard /></ClientGuard>
        </Route>
        <Route path="/portal/projects">
          <ClientGuard><PortalProjects /></ClientGuard>
        </Route>
        <Route path="/portal/invoices">
          <ClientGuard><PortalInvoices /></ClientGuard>
        </Route>
        <Route path="/portal/quotes">
          <ClientGuard><PortalQuotes /></ClientGuard>
        </Route>

        {/* 404 */}

        <Route component={NotFound} />
      </Switch>

      {/* Floating WhatsApp chat — shown on public pages only */}
      {(!user || user.role === "client") && <LiveChat />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
