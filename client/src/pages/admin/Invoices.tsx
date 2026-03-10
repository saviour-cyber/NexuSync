import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AdminInvoices() {
    const qc = useQueryClient();
    const { toast } = useToast();
    const { data: invoices = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/invoices"],
        queryFn: () => fetch("/api/admin/invoices", { credentials: "include" }).then(r => r.json()),
    });

    const updateInvoice = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            fetch(`/api/admin/invoices/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status, ...(status === "paid" ? { paidAt: new Date().toISOString() } : {}) }) }).then(r => r.json()),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/invoices"] }),
    });

    const verifyBankMutation = useMutation({
        mutationFn: async (data: { invoiceId: number, reference: string, amount: number }) => {
            const res = await apiRequest("POST", "/api/admin/payments/bank/verify", data);
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Payment Verified", description: "Invoice has been marked as paid." });
            qc.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
        },
        onError: () => {
            toast({ title: "Verification Failed", description: "Could not verify bank transfer.", variant: "destructive" });
        }
    });

    const stColors: Record<string, string> = {
        unpaid: "bg-amber-100 text-amber-700",
        pending: "bg-blue-100 text-blue-700",
        paid: "bg-emerald-100 text-emerald-700",
        overdue: "bg-red-100 text-red-700",
        failed: "bg-red-100 text-red-700"
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
                                {["Invoice", "Client", "Amount", "Status", "Payment Details", "Due Date", "Action"].map(h => (
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
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="h-7 text-xs bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                                                onClick={() => verifyBankMutation.mutate({ 
                                                    invoiceId: inv.id, 
                                                    reference: inv.paymentReference || 'MANUAL_VERIFY', 
                                                    amount: inv.amount 
                                                })}
                                                disabled={verifyBankMutation.isPending}
                                            >
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Verify
                                            </Button>
                                        )}
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
