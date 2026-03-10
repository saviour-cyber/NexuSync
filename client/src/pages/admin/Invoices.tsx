import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Plus, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AdminInvoices() {
    const qc = useQueryClient();
    const { toast } = useToast();
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState({ projectId: "", clientId: "", amount: "", dueDate: "" });

    const { data: invoices = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/invoices"],
        queryFn: () => fetch("/api/admin/invoices", { credentials: "include" }).then(r => r.json()),
    });

    const { data: projects = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/projects"],
        queryFn: () => fetch("/api/admin/projects", { credentials: "include" }).then(r => r.json()),
    });

    const { data: customers = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/customers"],
        queryFn: () => fetch("/api/admin/customers", { credentials: "include" }).then(r => r.json()),
    });

    const createInvoice = useMutation({
        mutationFn: (data: any) =>
            fetch("/api/admin/invoices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    projectId: data.projectId ? parseInt(data.projectId) : null,
                    clientId: data.clientId ? parseInt(data.clientId) : null,
                    amount: parseInt(data.amount),
                    status: "unpaid",
                    dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
                }),
            }).then(r => r.json()),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
            toast({ title: "✅ Invoice created successfully" });
            setCreateOpen(false);
            setForm({ projectId: "", clientId: "", amount: "", dueDate: "" });
        },
        onError: () => toast({ title: "Failed to create invoice", variant: "destructive" }),
    });

    const updateInvoice = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            fetch(`/api/admin/invoices/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ status, ...(status === "paid" ? { paidAt: new Date().toISOString() } : {}) }),
            }).then(r => r.json()),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/invoices"] }),
    });

    const verifyBankMutation = useMutation({
        mutationFn: async (data: { invoiceId: number; reference: string; amount: number }) => {
            const res = await apiRequest("POST", "/api/admin/payments/bank/verify", data);
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Payment Verified", description: "Invoice has been marked as paid." });
            qc.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
        },
        onError: () => toast({ title: "Verification Failed", variant: "destructive" }),
    });

    // Auto-fill client & amount when project is selected
    const handleProjectChange = (projectId: string) => {
        const project = projects.find((p: any) => p.id === parseInt(projectId));
        setForm(f => ({
            ...f,
            projectId,
            clientId: project?.clientId?.toString() || f.clientId,
            amount: project?.budget?.toString() || f.amount,
        }));
    };

    const stColors: Record<string, string> = {
        unpaid: "bg-amber-100 text-amber-700",
        pending: "bg-blue-100 text-blue-700",
        paid: "bg-emerald-100 text-emerald-700",
        overdue: "bg-red-100 text-red-700",
        failed: "bg-red-100 text-red-700",
    };

    return (
        <AdminLayout>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-secondary">Invoices</h1>
                    <p className="text-muted-foreground mt-1">Track billing and payments.</p>
                </div>
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Create Invoice
                </Button>
            </div>

            <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                {invoices.length === 0 ? (
                    <div className="p-16 text-center">
                        <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">No invoices yet.</p>
                        <p className="text-sm text-muted-foreground/70 mb-4">Create your first invoice or generate one from a project.</p>
                        <Button onClick={() => setCreateOpen(true)} variant="outline" className="gap-2">
                            <Plus className="w-4 h-4" /> Create Invoice
                        </Button>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="border-b border-border/50 bg-slate-50">
                            <tr>
                                {["Invoice", "Client", "Project", "Amount", "Status", "Payment", "Due Date", "Action"].map(h => (
                                    <th key={h} className="text-left p-4 font-semibold text-secondary text-xs uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                            {invoices.map((inv: any) => {
                                const project = projects.find((p: any) => p.id === inv.projectId);
                                const client = customers.find((c: any) => c.id === inv.clientId);
                                return (
                                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-medium text-secondary">#INV-{String(inv.id).padStart(4, "0")}</td>
                                        <td className="p-4 text-muted-foreground">{client?.name || `Client #${inv.clientId || "N/A"}`}</td>
                                        <td className="p-4 text-muted-foreground text-xs">{project?.title || "—"}</td>
                                        <td className="p-4 font-bold text-secondary">KSh {inv.amount?.toLocaleString()}</td>
                                        <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${stColors[inv.status] || "bg-slate-100"}`}>{inv.status}</span></td>
                                        <td className="p-4 text-xs text-muted-foreground">
                                            {inv.paymentMethod ? (
                                                <div className="flex flex-col">
                                                    <span className="capitalize font-medium text-slate-700">{inv.paymentMethod}</span>
                                                    {inv.paymentReference && <span>Ref: {inv.paymentReference}</span>}
                                                </div>
                                            ) : "—"}
                                        </td>
                                        <td className="p-4 text-muted-foreground">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</td>
                                        <td className="p-4 flex gap-2 items-center">
                                            <Select value={inv.status} onValueChange={v => updateInvoice.mutate({ id: inv.id, status: v })}>
                                                <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                                                <SelectContent>{["unpaid", "pending", "paid", "overdue", "failed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                            </Select>
                                            {inv.paymentMethod === "bank" && inv.status !== "paid" && (
                                                <Button size="sm" variant="outline" className="h-7 text-xs bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                                                    onClick={() => verifyBankMutation.mutate({ invoiceId: inv.id, reference: inv.paymentReference || "MANUAL_VERIFY", amount: inv.amount })}
                                                    disabled={verifyBankMutation.isPending}>
                                                    <CheckCircle className="w-3 h-3 mr-1" /> Verify
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Invoice Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Invoice</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Project (optional — auto-fills client & amount)</label>
                            <Select value={form.projectId} onValueChange={handleProjectChange}>
                                <SelectTrigger><SelectValue placeholder="Select a project..." /></SelectTrigger>
                                <SelectContent>
                                    {projects.map((p: any) => (
                                        <SelectItem key={p.id} value={p.id.toString()}>{p.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Client *</label>
                            <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                                <SelectTrigger><SelectValue placeholder="Select a client..." /></SelectTrigger>
                                <SelectContent>
                                    {customers.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name} ({c.email})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Amount (KSh) *</label>
                            <Input type="number" placeholder="e.g. 50000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Due Date (optional)</label>
                            <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                        </div>
                        <Button
                            className="w-full gap-2"
                            disabled={!form.clientId || !form.amount || createInvoice.isPending}
                            onClick={() => createInvoice.mutate(form)}
                        >
                            <FileText className="w-4 h-4" />
                            {createInvoice.isPending ? "Creating..." : "Create Invoice"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
