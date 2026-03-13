import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortalLayout } from "@/components/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FileText, Phone, CheckCircle2, Clock, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function PortalInvoices() {
    const { toast } = useToast();
    const qc = useQueryClient();

    // Modal & Selection state
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [isMpesaOpen, setIsMpesaOpen] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");

    const { data: invoices = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/portal/invoices"],
        queryFn: () => fetch("/api/portal/invoices", { credentials: "include" }).then(r => r.json()),
    });

    const mpesaMutation = useMutation({
        mutationFn: async (data: { invoiceId: number, phone: string }) => {
            const res = await apiRequest("POST", "/api/payments/mpesa/stkpush", data);
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "M-Pesa Prompt Sent", description: "Please check your phone and enter your PIN." });
            setIsMpesaOpen(false);
            qc.invalidateQueries({ queryKey: ["/api/portal/invoices"] });
        },
        onError: () => toast({ title: "Payment Failed", description: "Could not send STK push.", variant: "destructive" })
    });

    if (isLoading) {
        return <PortalLayout><div className="flex justify-center p-20 text-muted-foreground">Loading invoices...</div></PortalLayout>;
    }

    return (
        <PortalLayout>
            <div className="mb-8 max-w-5xl mx-auto">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Billing & Invoices</h1>
                <p className="text-slate-500 mt-2 text-lg">Manage your payments and billing history securely.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {invoices.length === 0 ? (
                    <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900">No Invoices</h3>
                        <p className="text-slate-500 mt-1">You're all caught up! There are no pending invoices.</p>
                    </div>
                ) : (
                    invoices.map((inv) => (
                        <div key={inv.id} className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group">
                            <div className="p-6 pb-5 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Invoice</p>
                                        <p className="font-semibold text-slate-900">#INV-{String(inv.id).padStart(4, "0")}</p>
                                    </div>
                                </div>

                                <h3 className="text-2xl font-bold text-slate-900 mt-2 mb-1">
                                    KSh {inv.amount.toLocaleString()}
                                </h3>

                                <div className="flex items-center gap-2 mt-4 text-sm font-medium">
                                    {inv.status === "paid" ? (
                                        <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4" /> Paid
                                        </div>
                                    ) : inv.status === "pending" ? (
                                        <div className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" /> Awaiting confirmation
                                        </div>
                                    ) : inv.status === "failed" || inv.status === "overdue" ? (
                                        <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                            <Ban className="w-4 h-4" /> {inv.status === "failed" ? "Failed" : "Overdue"}
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" /> Pending
                                        </div>
                                    )}
                                </div>

                                {inv.dueDate && (
                                    <p className="text-sm text-slate-500 mt-5 flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        Due {new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </p>
                                )}
                            </div>

                            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-2">
                                {(inv.status === "unpaid" || inv.status === "failed" || inv.status === "overdue") ? (
                                    <Button
                                        className="w-full bg-[#18C972] hover:bg-[#14A960] text-white shadow-sm transition-all"
                                        onClick={() => { setSelectedInvoice(inv); setIsMpesaOpen(true); }}
                                    >
                                        <Phone className="w-4 h-4 mr-2" /> Pay with M-Pesa
                                    </Button>
                                ) : (
                                    <Button variant="outline" className="w-full bg-white border-slate-200 text-slate-600">
                                        Download PDF
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* M-Pesa Modal */}
            <Dialog open={isMpesaOpen} onOpenChange={setIsMpesaOpen}>
                <DialogContent className="sm:max-w-md p-6">
                    <DialogHeader className="mb-4">
                        <div className="w-12 h-12 rounded-full bg-[#18C972]/10 flex items-center justify-center mb-4">
                            <Phone className="w-6 h-6 text-[#18C972]" />
                        </div>
                        <DialogTitle className="text-2xl">Pay via M-Pesa</DialogTitle>
                        <DialogDescription className="text-base mt-2">
                            You are paying <strong className="text-slate-900">KSh {selectedInvoice?.amount.toLocaleString()}</strong> for Invoice #INV-{String(selectedInvoice?.id).padStart(4, "0")}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <Label className="text-slate-700">M-Pesa Number</Label>
                            <Input
                                placeholder="e.g. 0712345678"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="h-12 text-lg px-4 bg-slate-50"
                            />
                            <p className="text-sm text-slate-500">A payment prompt will appear on your phone automatically.</p>
                        </div>

                        <Button
                            className="w-full h-12 text-lg bg-[#18C972] hover:bg-[#14A960] text-white"
                            onClick={() => {
                                if (selectedInvoice && phoneNumber) {
                                    mpesaMutation.mutate({ invoiceId: selectedInvoice.id, phone: phoneNumber });
                                }
                            }}
                            disabled={!phoneNumber || mpesaMutation.isPending}
                        >
                            {mpesaMutation.isPending ? "Sending Prompt..." : "Send Payment Prompt"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </PortalLayout>
    );
}
