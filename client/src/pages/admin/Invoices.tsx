import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText } from "lucide-react";

export default function AdminInvoices() {
    const qc = useQueryClient();
    const { data: invoices = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/invoices"],
        queryFn: () => fetch("/api/admin/invoices", { credentials: "include" }).then(r => r.json()),
    });

    const updateInvoice = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            fetch(`/api/admin/invoices/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status, ...(status === "paid" ? { paidAt: new Date().toISOString() } : {}) }) }).then(r => r.json()),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/invoices"] }),
    });

    const stColors: Record<string, string> = {
        unpaid: "bg-amber-100 text-amber-700",
        paid: "bg-emerald-100 text-emerald-700",
        overdue: "bg-red-100 text-red-700",
    };

    return (
        <AdminLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-secondary">Invoices</h1>
                <p className="text-muted-foreground mt-1">Track billing and payments.</p>
            </div>
            <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                {invoices.length === 0 ? (
                    <div className="p-16 text-center">
                        <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-muted-foreground">No invoices created yet.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b border-border/50 bg-slate-50">
                            <tr>
                                {["Invoice", "Client", "Amount", "Status", "Due Date", "Action"].map(h => (
                                    <th key={h} className="text-left p-4 font-semibold text-secondary text-xs uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {invoices.map((inv: any) => (
                                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-4 font-medium text-secondary">#INV-{String(inv.id).padStart(4, "0")}</td>
                                    <td className="p-4 text-muted-foreground">Client #{inv.clientId || "N/A"}</td>
                                    <td className="p-4 font-bold text-secondary">${inv.amount.toLocaleString()}</td>
                                    <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${stColors[inv.status] || "bg-slate-100"}`}>{inv.status}</span></td>
                                    <td className="p-4 text-muted-foreground">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td>
                                    <td className="p-4">
                                        <Select value={inv.status} onValueChange={v => updateInvoice.mutate({ id: inv.id, status: v })}>
                                            <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                                            <SelectContent>{["unpaid", "paid", "overdue"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </AdminLayout>
    );
}
