import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { CreditCard, CheckCircle, Clock, AlertCircle, Smartphone, Building2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    unpaid: "bg-slate-100 text-slate-600",
    failed: "bg-red-100 text-red-700",
    partially_paid: "bg-blue-100 text-blue-700",
};

const statusIcon: Record<string, any> = {
    paid: CheckCircle,
    pending: Clock,
    unpaid: AlertCircle,
    failed: AlertCircle,
    partially_paid: Clock,
};

export default function AdminPayments() {
    const { toast } = useToast();
    const qc = useQueryClient();
    const [bankModal, setBankModal] = useState<any>(null);
    const [bankRef, setBankRef] = useState("");
    const [bankAmount, setBankAmount] = useState("");
    const [mpesaModal, setMpesaModal] = useState<any>(null);
    const [mpesaPhone, setMpesaPhone] = useState("");

    const { data: invoices = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/invoices"],
        queryFn: () => fetch("/api/admin/invoices", { credentials: "include" }).then(r => r.json()),
    });

    const verifyBank = useMutation({
        mutationFn: async ({ invoiceId, reference, amount }: any) => {
            const r = await fetch("/api/admin/payments/bank/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invoiceId, reference, amount: parseInt(amount) }),
                credentials: "include",
            });
            if (!r.ok) throw new Error("Verification failed");
            return r.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
            toast({ title: "✅ Bank payment verified and marked as paid" });
            setBankModal(null);
            setBankRef(""); setBankAmount("");
        },
        onError: () => toast({ title: "Verification failed", variant: "destructive" }),
    });

    const initiateMpesa = useMutation({
        mutationFn: async ({ invoiceId, phoneNumber }: any) => {
            const r = await fetch("/api/payments/mpesa/initiate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invoiceId, phoneNumber }),
                credentials: "include",
            });
            if (!r.ok) throw new Error("STK push failed");
            return r.json();
        },
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
            toast({ title: `📲 STK Push Sent! Txn: ${data.transactionId}` });
            setMpesaModal(null); setMpesaPhone("");
        },
        onError: () => toast({ title: "M-Pesa initiation failed", variant: "destructive" }),
    });

    const total = invoices.reduce((s: number, i: any) => s + i.amount, 0);
    const paid = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + i.amount, 0);
    const outstanding = total - paid;

    return (
        <AdminLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-secondary">B2B Payments</h1>
                <p className="text-muted-foreground mt-1">Manage M-Pesa and bank transfer payments across all client invoices.</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                    { label: "Total Revenue", value: `KSh ${total.toLocaleString()}`, icon: DollarSign, color: "text-primary" },
                    { label: "Collected", value: `KSh ${paid.toLocaleString()}`, icon: CheckCircle, color: "text-emerald-600" },
                    { label: "Outstanding", value: `KSh ${outstanding.toLocaleString()}`, icon: AlertCircle, color: "text-amber-600" },
                ].map(c => (
                    <div key={c.label} className="bg-white rounded-2xl border border-border/50 shadow-sm p-5 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center ${c.color}`}>
                            <c.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{c.label}</p>
                            <p className="text-xl font-bold text-secondary">{c.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border/30 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    <h2 className="font-semibold text-secondary">All Invoices</h2>
                </div>
                {invoices.length === 0 ? (
                    <div className="p-16 text-center text-muted-foreground">
                        <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p>No invoices yet. Generate them from the Projects page.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border/30">
                        {invoices.map((inv: any) => {
                            const StatusIcon = statusIcon[inv.status] || AlertCircle;
                            return (
                                <div key={inv.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors gap-4">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0">
                                            <span className="text-primary text-sm font-bold">#{inv.id}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-secondary text-sm">Invoice #{inv.id}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {inv.paymentMethod ? `via ${inv.paymentMethod.toUpperCase()}` : "No payment method yet"}
                                                {inv.paymentReference && ` · Ref: ${inv.paymentReference}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <span className="text-sm font-bold text-secondary">KSh {inv.amount?.toLocaleString()}</span>
                                        <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[inv.status] || "bg-slate-100 text-slate-600"}`}>
                                            <StatusIcon className="w-3 h-3" />{inv.status}
                                        </span>
                                        {inv.status !== "paid" && (
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => { setMpesaModal(inv); setMpesaPhone(""); }}>
                                                    <Smartphone className="w-3 h-3" /> M-Pesa
                                                </Button>
                                                <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => { setBankModal(inv); setBankRef(""); setBankAmount(""); }}>
                                                    <Building2 className="w-3 h-3" /> Bank
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bank Verify Modal */}
            <Dialog open={!!bankModal} onOpenChange={() => setBankModal(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Verify Bank Transfer — Invoice #{bankModal?.id}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Bank Reference Number</label>
                            <Input placeholder="e.g. TXN2024001234" value={bankRef} onChange={e => setBankRef(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Amount Received (KSh)</label>
                            <Input type="number" placeholder={bankModal?.amount?.toString()} value={bankAmount} onChange={e => setBankAmount(e.target.value)} />
                        </div>
                        <Button className="w-full" disabled={!bankRef || verifyBank.isPending}
                            onClick={() => verifyBank.mutate({ invoiceId: bankModal.id, reference: bankRef, amount: bankAmount || bankModal?.amount })}>
                            {verifyBank.isPending ? "Verifying..." : "✅ Mark as Paid"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* M-Pesa Modal */}
            <Dialog open={!!mpesaModal} onOpenChange={() => setMpesaModal(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>M-Pesa STK Push — Invoice #{mpesaModal?.id}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground">Amount: <span className="font-bold text-secondary">KSh {mpesaModal?.amount?.toLocaleString()}</span></p>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Client Phone Number</label>
                            <Input placeholder="e.g. 0712345678" value={mpesaPhone} onChange={e => setMpesaPhone(e.target.value)} />
                        </div>
                        <Button className="w-full" disabled={!mpesaPhone || initiateMpesa.isPending}
                            onClick={() => initiateMpesa.mutate({ invoiceId: mpesaModal.id, phoneNumber: mpesaPhone })}>
                            {initiateMpesa.isPending ? "Sending..." : "📲 Send STK Push"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
