import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { TrendingUp, Users, FolderKanban, DollarSign } from "lucide-react";

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

export default function AdminAnalytics() {
    const { data: analytics } = useQuery({
        queryKey: ["/api/admin/analytics"],
        queryFn: () => fetch("/api/admin/analytics", { credentials: "include" }).then(r => r.json()),
    });
    const { data: projects = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/projects"],
        queryFn: () => fetch("/api/admin/projects", { credentials: "include" }).then(r => r.json()),
    });
    const { data: quotes = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/quotes"],
        queryFn: () => fetch("/api/admin/quotes", { credentials: "include" }).then(r => r.json()),
    });

    const statusData = Object.entries(
        (projects as any[]).reduce((acc: any, p: any) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
        }, {})
    ).map(([name, value]) => ({ name, value }));

    const quoteStatusData = Object.entries(
        (quotes as any[]).reduce((acc: any, q: any) => {
            acc[q.status] = (acc[q.status] || 0) + 1;
            return acc;
        }, {})
    ).map(([name, value]) => ({ name, value }));

    const stats = [
        { icon: Users, label: "Total Clients", value: analytics?.totalClients ?? 0, color: "text-blue-500 bg-blue-50" },
        { icon: FolderKanban, label: "Total Projects", value: analytics?.totalProjects ?? 0, color: "text-violet-500 bg-violet-50" },
        { icon: DollarSign, label: "Revenue (Paid)", value: `$${(analytics?.totalRevenue ?? 0).toLocaleString()}`, color: "text-emerald-500 bg-emerald-50" },
        { icon: TrendingUp, label: "Pending Quotes", value: analytics?.pendingQuotes ?? 0, color: "text-amber-500 bg-amber-50" },
    ];

    return (
        <AdminLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-secondary">Analytics</h1>
                <p className="text-muted-foreground mt-1">Track your business performance.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-border/50 shadow-sm p-5">
                        <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <p className="text-2xl font-bold text-secondary">{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project status pie */}
                <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
                    <h2 className="font-bold text-secondary mb-4">Projects by Status</h2>
                    {statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name} (${value})`}>
                                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No project data yet</div>}
                </div>

                {/* Quote status bar */}
                <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
                    <h2 className="font-bold text-secondary mb-4">Quotes by Status</h2>
                    {quoteStatusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={quoteStatusData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No quote data yet</div>}
                </div>
            </div>
        </AdminLayout>
    );
}
