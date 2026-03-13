import { useQuery } from "@tanstack/react-query";
import { PortalLayout } from "@/components/PortalLayout";
import { useAuth } from "@/lib/auth";
import { FolderKanban, FileText, Activity } from "lucide-react";

export default function PortalDashboard() {
    const { user } = useAuth();
    const { data: projects = [] } = useQuery<any[]>({
        queryKey: ["/api/portal/projects"],
        queryFn: () => fetch("/api/portal/projects", { credentials: "include" }).then(r => r.json()),
    });
    const { data: invoices = [] } = useQuery<any[]>({
        queryKey: ["/api/portal/invoices"],
        queryFn: () => fetch("/api/portal/invoices", { credentials: "include" }).then(r => r.json()),
    });

    const unpaid = invoices.filter((i: any) => i.status === "unpaid");
    const active = projects.filter((p: any) => p.status === "active");

    return (
        <PortalLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-secondary">Welcome back, {user?.name?.split(" ")[0]}!</h1>
                <p className="text-muted-foreground mt-1">Here's an overview of your account.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {[
                    { label: "Total Projects", value: projects.length, icon: FolderKanban, color: "bg-violet-500" },
                    { label: "Active Projects", value: active.length, icon: Activity, color: "bg-emerald-500" },
                    { label: "Unpaid Invoices", value: unpaid.length, icon: FileText, color: "bg-amber-500" },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-border/50 shadow-sm p-5">
                        <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
                            <s.icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="text-2xl font-bold text-secondary">{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Projects */}
                <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
                    <h2 className="font-bold text-secondary mb-4 flex items-center gap-2"><FolderKanban className="w-5 h-5 text-primary" /> My Projects</h2>
                    {projects.length ? (
                        <ul className="space-y-3">
                            {projects.map((p: any) => (
                                <li key={p.id} className="p-3 rounded-xl bg-slate-50">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-semibold text-secondary text-sm">{p.title}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{p.status}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                                        <div className="bg-primary h-1.5 rounded-full" style={{ width: `${p.progress || 0}%` }} />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{p.progress || 0}% complete</p>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-muted-foreground text-sm">No projects assigned yet.</p>}
                </div>

                {/* Invoices */}
                <div className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
                    <h2 className="font-bold text-secondary mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Recent Invoices</h2>
                    {invoices.length ? (
                        <ul className="space-y-3">
                            {invoices.map((inv: any) => (
                                <li key={inv.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50">
                                    <div>
                                        <p className="font-semibold text-secondary text-sm">#INV-{String(inv.id).padStart(4, "0")}</p>
                                        <p className="text-xs text-muted-foreground">{inv.dueDate ? `Due ${new Date(inv.dueDate).toLocaleDateString()}` : "No due date"}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-secondary text-sm">KSh {inv.amount.toLocaleString()}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : inv.status === "overdue" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{inv.status}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-muted-foreground text-sm">No invoices yet.</p>}
                </div>
            </div>
        </PortalLayout>
    );
}
