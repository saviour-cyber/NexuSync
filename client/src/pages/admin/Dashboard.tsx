import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Users, FolderKanban, TrendingUp, MessageSquare, Quote, Activity, DollarSign, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

function StatCard({ icon: Icon, label, value, color, delay }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            className="bg-white rounded-2xl p-6 border border-border/50 shadow-sm hover:shadow-md transition-shadow"
        >
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-3xl font-bold text-secondary mb-1">{value ?? "—"}</p>
            <p className="text-sm text-muted-foreground font-medium">{label}</p>
        </motion.div>
    );
}

export default function AdminDashboard() {
    const { data: analytics } = useQuery({
        queryKey: ["/api/admin/analytics"],
        queryFn: () => fetch("/api/admin/analytics", { credentials: "include" }).then(r => r.json()),
    });
    const { data: messages } = useQuery({
        queryKey: ["/api/admin/messages"],
        queryFn: () => fetch("/api/admin/messages", { credentials: "include" }).then(r => r.json()),
    });
    const { data: projects } = useQuery({
        queryKey: ["/api/admin/projects"],
        queryFn: () => fetch("/api/admin/projects", { credentials: "include" }).then(r => r.json()),
    });
    const { data: quotes } = useQuery({
        queryKey: ["/api/admin/quotes"],
        queryFn: () => fetch("/api/admin/quotes", { credentials: "include" }).then(r => r.json()),
    });

    const stats = [
        { icon: Users, label: "Total Clients", value: analytics?.totalClients, color: "bg-blue-500", delay: 0 },
        { icon: FolderKanban, label: "Active Projects", value: analytics?.activeProjects, color: "bg-violet-500", delay: 0.05 },
        { icon: DollarSign, label: "Total Revenue", value: analytics?.totalRevenue ? `$${analytics.totalRevenue.toLocaleString()}` : "$0", color: "bg-emerald-500", delay: 0.1 },
        { icon: Quote, label: "Pending Quotes", value: analytics?.pendingQuotes, color: "bg-amber-500", delay: 0.15 },
        { icon: MessageSquare, label: "Unread Messages", value: analytics?.unreadMessages, color: "bg-rose-500", delay: 0.2 },
        { icon: Activity, label: "Total Projects", value: analytics?.totalProjects, color: "bg-indigo-500", delay: 0.25 },
    ];

    return (
        <AdminLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-secondary">Dashboard</h1>
                <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening.</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                {stats.map(s => <StatCard key={s.label} {...s} />)}
            </div>

            {/* Recent content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent messages */}
                <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" /> Recent Messages
                    </h2>
                    {messages?.length ? (
                        <ul className="space-y-3">
                            {(messages as any[]).slice(0, 5).map((m: any) => (
                                <li key={m.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                                        {m.name[0]}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-semibold text-secondary text-sm">{m.name} {!m.read && <span className="ml-1 px-1.5 py-0.5 bg-primary text-white text-[10px] rounded-full">New</span>}</p>
                                        <p className="text-muted-foreground text-xs truncate">{m.message}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-muted-foreground text-sm">No messages yet.</p>}
                </div>

                {/* Recent projects */}
                <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                        <FolderKanban className="w-5 h-5 text-primary" /> Recent Projects
                    </h2>
                    {projects?.length ? (
                        <ul className="space-y-3">
                            {(projects as any[]).slice(0, 5).map((p: any) => (
                                <li key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${p.status === "active" ? "bg-emerald-500" :
                                            p.status === "completed" ? "bg-blue-500" :
                                                p.status === "on-hold" ? "bg-amber-500" : "bg-red-500"
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-secondary text-sm truncate">{p.title}</p>
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${p.progress || 0}%` }} />
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">{p.progress || 0}%</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-muted-foreground text-sm">No projects yet.</p>}
                </div>

                {/* Recent quotes */}
                <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-secondary mb-4 flex items-center gap-2">
                        <Quote className="w-5 h-5 text-primary" /> Recent Quote Requests
                    </h2>
                    {quotes?.length ? (
                        <ul className="space-y-3">
                            {(quotes as any[]).slice(0, 5).map((q: any) => (
                                <li key={q.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                    <div>
                                        <p className="font-semibold text-secondary text-sm">{q.name}</p>
                                        <p className="text-muted-foreground text-xs">{q.email}</p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${q.status === "pending" ? "bg-amber-100 text-amber-700" :
                                            q.status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                                                "bg-slate-100 text-slate-600"
                                        }`}>{q.status}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-muted-foreground text-sm">No quotes yet.</p>}
                </div>
            </div>
        </AdminLayout>
    );
}
