import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, FolderKanban, FileText, LogOut, Cpu, ChevronRight, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
    { icon: LayoutDashboard, label: "My Dashboard", href: "/portal" },
    { icon: FolderKanban, label: "My Projects", href: "/portal/projects" },
    { icon: ClipboardList, label: "My Quotes", href: "/portal/quotes" },
    { icon: FileText, label: "Invoices", href: "/portal/invoices" },
];

export function PortalLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const [location] = useLocation();

    return (
        <div className="min-h-screen flex bg-slate-50">
            <aside className="w-64 bg-white border-r border-border/50 flex flex-col shadow-sm shrink-0">
                <div className="p-6 border-b border-border/50">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                            <Cpu className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg tracking-tight">Nexa<span className="text-primary">Sync</span></span>
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">Client Portal</p>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {navItems.map(({ icon: Icon, label, href }) => {
                        const active = location === href || (href !== "/portal" && location.startsWith(href));
                        return (
                            <Link key={href} href={href}>
                                <a className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active ? "bg-primary text-white shadow-md shadow-primary/25" : "text-muted-foreground hover:bg-slate-100 hover:text-secondary"}`}>
                                    <Icon className="w-4 h-4 shrink-0" />
                                    {label}
                                    {active && <ChevronRight className="w-3 h-3 ml-auto" />}
                                </a>
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-border/50">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {user?.name?.[0]?.toUpperCase() ?? "C"}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-secondary truncate">{user?.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full" onClick={logout}>
                        <LogOut className="w-3 h-3 mr-2" /> Sign Out
                    </Button>
                </div>
            </aside>
            <main className="flex-1 overflow-y-auto">
                <motion.div key={location} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="p-8">
                    {children}
                </motion.div>
            </main>
        </div>
    );
}
