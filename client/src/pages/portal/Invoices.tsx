import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortalLayout } from "@/components/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FileText, Phone, CheckCircle2, Clock, Ban, Loader2, Smartphone, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Payment flow steps
type PayStep = "enter_phone" | "waiting" | "success" | "failed";

export default function PortalInvoices() {
    const qc = useQueryClient();

    // Modal state
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<PayStep>("enter_phone");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [pollCount, setPollCount] = useState(0);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const { data: invoices = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/portal/invoices"],
        queryFn: () => fetch("/api/portal/invoices", { credentials: "include" }).then(r => r.json()),
    });

    // Poll for payment confirmation when waiting
    useEffect(() => {
        if (step === "waiting" && selectedInvoice) {
            let count = 0;
            pollRef.current = setInterval(async () => {
                count++;
                setPollCount(count);
                // Check if invoice is now paid
                const res = await fetch("/api/portal/invoices", { credentials: "include" });
                const data = await res.json();
                const updated = data.find((i: any) => i.id === selectedInvoice.id);
                if (updated?.status === "paid") {
                    clearInterval(pollRef.current!);
                    setStep("success");
                    qc.invalidateQueries({ queryKey: ["/api/portal/invoices"] });
                }
                // Stop polling after 2 minutes (24 × 5s)
                if (count >= 24) {
                    clearInterval(pollRef.current!);
                    setStep("failed");
                }
            }, 5000);
        }
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [step, selectedInvoice]);

    const stkMutation = useMutation({
        mutationFn: async (data: { invoiceId: number; phone: string }) => {
            const res = await apiRequest("POST", "/api/payments/mpesa/stkpush", data);
            return res.json();
        },
        onSuccess: () => {
            setStep("waiting");
        },
        onError: () => {
            setStep("failed");
        },
    });

    const openPayment = (inv: any) => {
        setSelectedInvoice(inv);
        setStep("enter_phone");
        setPhoneNumber("");
        setPollCount(0);
        setIsOpen(true);
    };

    const closeModal = () => {
        if (pollRef.current) clearInterval(pollRef.current);
        setIsOpen(false);
        setStep("enter_phone");
    };

    const statusDisplay: Record<string, string> = {
        unpaid: "Pending",
        pending: "Awaiting confirmation",
        paid: "Paid",
        overdue: "Overdue",
        failed: "Failed",
    };

    const isPayable = (status: string) => ["unpaid", "failed", "overdue"].includes(status);

    if (isLoading) {
        return (
            <PortalLayout>
                <div className="flex justify-center items-center p-20">
                    <Loader2 className="w-8 h-8 animate-spin text-[#18C972]" />
                </div>
            </PortalLayout>
        );
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
                        <div key={inv.id} className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
                            {/* Header stripe */}
                            <div className={`h-1.5 w-full ${inv.status === "paid" ? "bg-emerald-400" : inv.status === "overdue" ? "bg-red-400" : "bg-[#18C972]"}`} />

                            <div className="p-6 pb-5 flex-1">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-slate-600" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Invoice</p>
                                        <p className="font-bold text-slate-900">#INV-{String(inv.id).padStart(4, "0")}</p>
                                    </div>
                                </div>

                                <h3 className="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                                    KES {inv.amount.toLocaleString()}
                                </h3>

                                {inv.description && (
                                    <p className="text-sm text-slate-500 mt-1">{inv.description}</p>
                                )}

                                <div className="flex items-center gap-2 mt-4 text-sm font-medium">
                                    {inv.status === "paid" ? (
                                        <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4" /> Paid
                                        </div>
                                    ) : inv.status === "pending" ? (
                                        <div className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" /> Awaiting confirmation
                                        </div>
                                    ) : inv.status === "overdue" ? (
                                        <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                            <Ban className="w-4 h-4" /> Overdue
                                        </div>
                                    ) : inv.status === "failed" ? (
                                        <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                            <Ban className="w-4 h-4" /> Failed
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" /> Pending
                                        </div>
                                    )}
                                </div>

                                {inv.dueDate && (
                                    <p className="text-sm text-slate-400 mt-4 flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        Due {new Date(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                    </p>
                                )}
                            </div>

                            <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                                {isPayable(inv.status) ? (
                                    <Button
                                        className="w-full h-11 bg-[#18C972] hover:bg-[#14A960] text-white font-semibold shadow-sm shadow-[#18C972]/30 transition-all"
                                        onClick={() => openPayment(inv)}
                                    >
                                        <Smartphone className="w-4 h-4 mr-2" />
                                        Pay with M-Pesa
                                    </Button>
                                ) : inv.status === "paid" ? (
                                    <div className="flex items-center justify-center gap-2 py-2.5 text-emerald-600 text-sm font-semibold">
                                        <CheckCircle2 className="w-4 h-4" /> Payment Complete
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 py-2.5 text-amber-600 text-sm font-semibold">
                                        <Clock className="w-4 h-4" /> Awaiting confirmation…
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ── M-Pesa Payment Modal ── */}
            <Dialog open={isOpen} onOpenChange={closeModal}>
                <DialogContent className="sm:max-w-sm p-0 overflow-hidden rounded-3xl border-0 shadow-2xl">

                    {/* ── Step 1: Enter Phone ── */}
                    {step === "enter_phone" && (
                        <div>
                            {/* Top green header */}
                            <div className="bg-gradient-to-br from-[#18C972] to-[#0ea05a] px-6 pt-8 pb-10 text-white relative">
                                <button onClick={closeModal} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <p className="text-white/70 text-sm font-medium uppercase tracking-wider">Pay Invoice</p>
                                <h2 className="text-3xl font-extrabold mt-1 tracking-tight">
                                    KES {selectedInvoice?.amount.toLocaleString()}
                                </h2>
                                <p className="text-white/60 text-sm mt-1">#INV-{String(selectedInvoice?.id || 0).padStart(4, "0")}{selectedInvoice?.description ? ` · ${selectedInvoice.description}` : ""}</p>
                            </div>

                            {/* Form area */}
                            <div className="px-6 py-6 bg-white space-y-5">
                                <div className="space-y-1.5">
                                    <Label className="text-slate-800 font-semibold text-sm">M-Pesa Phone Number</Label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">+254</span>
                                        <Input
                                            className="pl-14 h-12 text-base bg-slate-50 border-slate-200 focus:border-[#18C972] focus:ring-[#18C972]/20"
                                            placeholder="7XX XXX XXX"
                                            value={phoneNumber}
                                            maxLength={9}
                                            inputMode="numeric"
                                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && phoneNumber.length >= 9) {
                                                    stkMutation.mutate({ invoiceId: selectedInvoice.id, phone: "0" + phoneNumber });
                                                }
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-400">Enter your Safaricom number to receive the payment prompt.</p>
                                </div>

                                <Button
                                    className="w-full h-12 text-base font-semibold bg-[#18C972] hover:bg-[#14A960] text-white shadow-lg shadow-[#18C972]/30 transition-all"
                                    onClick={() => stkMutation.mutate({ invoiceId: selectedInvoice.id, phone: "0" + phoneNumber })}
                                    disabled={phoneNumber.length < 9 || stkMutation.isPending}
                                >
                                    {stkMutation.isPending ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending…</>
                                    ) : (
                                        "Pay Now →"
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* ── Step 2: Waiting for PIN ── */}
                    {step === "waiting" && (
                        <div className="px-8 py-12 bg-white text-center">
                            {/* Pulsing phone animation */}
                            <div className="relative mx-auto w-24 h-24 mb-8">
                                <div className="absolute inset-0 rounded-full bg-[#18C972]/10 animate-ping" />
                                <div className="absolute inset-2 rounded-full bg-[#18C972]/20 animate-ping animation-delay-300" />
                                <div className="relative w-24 h-24 rounded-full bg-[#18C972]/20 flex items-center justify-center">
                                    <Smartphone className="w-10 h-10 text-[#18C972]" />
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-slate-900">Check Your Phone</h2>
                            <p className="text-slate-500 mt-3 text-base leading-relaxed">
                                An M-Pesa payment request has been sent to<br />
                                <span className="font-semibold text-slate-800">+254 {phoneNumber}</span>
                            </p>
                            <div className="mt-6 bg-slate-50 rounded-2xl p-4 space-y-1 text-sm text-slate-600">
                                <p>1. A payment prompt appeared on your phone</p>
                                <p>2. Enter your <strong>M-Pesa PIN</strong> to confirm</p>
                                <p>3. This page will update automatically</p>
                            </div>

                            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Waiting for confirmation… ({Math.round((24 - pollCount) * 5 / 60)}m remaining)
                            </div>

                            <button
                                onClick={() => { setStep("enter_phone"); if (pollRef.current) clearInterval(pollRef.current); }}
                                className="mt-6 text-sm text-slate-400 hover:text-slate-600 underline"
                            >
                                Didn't receive prompt? Try again
                            </button>
                        </div>
                    )}

                    {/* ── Step 3: Success ── */}
                    {step === "success" && (
                        <div className="px-8 py-12 bg-white text-center">
                            <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Payment Successful!</h2>
                            <p className="text-slate-500 mt-2 text-base">
                                KES {selectedInvoice?.amount.toLocaleString()} received.<br />
                                Invoice #INV-{String(selectedInvoice?.id || 0).padStart(4, "0")} has been marked as <strong className="text-emerald-600">Paid</strong>.
                            </p>
                            <Button
                                className="mt-8 w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                                onClick={closeModal}
                            >
                                Done
                            </Button>
                        </div>
                    )}

                    {/* ── Step 4: Failed ── */}
                    {step === "failed" && (
                        <div className="px-8 py-12 bg-white text-center">
                            <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
                                <X className="w-12 h-12 text-red-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Payment Not Confirmed</h2>
                            <p className="text-slate-500 mt-2 text-base leading-relaxed">
                                The payment prompt may have expired or was cancelled.<br />
                                Please try again.
                            </p>
                            <div className="flex flex-col gap-3 mt-8">
                                <Button
                                    className="w-full h-11 bg-[#18C972] hover:bg-[#14A960] text-white font-semibold"
                                    onClick={() => setStep("enter_phone")}
                                >
                                    Try Again
                                </Button>
                                <button onClick={closeModal} className="text-sm text-slate-400 hover:text-slate-600">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                </DialogContent>
            </Dialog>
        </PortalLayout>
    );
}
