import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortalLayout } from "@/components/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { FileText, Phone, Landmark, UploadCloud, CheckCircle2, Clock, Ban } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function PortalInvoices() {
    const { toast } = useToast();
    const qc = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Modal & Selection state
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [isMpesaOpen, setIsMpesaOpen] = useState(false);
    const [isBankOpen, setIsBankOpen] = useState(false);
    
    // Form state
    const [phoneNumber, setPhoneNumber] = useState("");
    const [receiptFile, setReceiptFile] = useState<File | null>(null);

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

    const bankUploadMutation = useMutation({
        mutationFn: async (data: { invoiceId: number, file: File }) => {
            const formData = new FormData();
            formData.append("invoiceId", data.invoiceId.toString());
            formData.append("receipt", data.file);
            
            const res = await fetch("/api/payments/bank/receipt", {
                method: "POST",
                body: formData,
            });
            if (!res.ok) throw new Error("Upload failed");
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Receipt Uploaded", description: "We will verify your payment shortly." });
            setIsBankOpen(false);
            setReceiptFile(null);
            qc.invalidateQueries({ queryKey: ["/api/portal/invoices"] });
        },
        onError: () => toast({ title: "Upload Failed", description: "Could not upload receipt.", variant: "destructive" })
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
                                            <Clock className="w-4 h-4" /> Processing
                                        </div>
                                    ) : inv.status === "failed" || inv.status === "overdue" ? (
                                        <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                            <Ban className="w-4 h-4" /> {inv.status === "failed" ? "Failed" : "Overdue"}
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                            <Clock className="w-4 h-4" /> Unpaid
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
                                    <>
                                        <Button 
                                            className="w-full bg-[#18C972] hover:bg-[#14A960] text-white shadow-sm transition-all"
                                            onClick={() => { setSelectedInvoice(inv); setIsMpesaOpen(true); }}
                                        >
                                            <Phone className="w-4 h-4 mr-2" /> Pay with M-Pesa
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            className="w-full bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                                            onClick={() => { setSelectedInvoice(inv); setIsBankOpen(true); }}
                                        >
                                            <Landmark className="w-4 h-4 mr-2 text-slate-400" /> Bank Transfer
                                        </Button>
                                    </>
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

            {/* Bank Transfer Modal */}
            <Dialog open={isBankOpen} onOpenChange={setIsBankOpen}>
                <DialogContent className="sm:max-w-md p-6">
                    <DialogHeader className="mb-4">
                        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                            <Landmark className="w-6 h-6 text-blue-600" />
                        </div>
                        <DialogTitle className="text-2xl">Bank Transfer</DialogTitle>
                        <DialogDescription className="text-base mt-2">
                            Please transfer <strong className="text-slate-900">KSh {selectedInvoice?.amount.toLocaleString()}</strong> to the following account, then upload your receipt.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6">
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                            <div className="grid grid-cols-3 gap-y-3 text-sm">
                                <div className="text-slate-500 font-medium">Bank</div>
                                <div className="col-span-2 font-semibold text-slate-900">Equity Bank</div>
                                
                                <div className="text-slate-500 font-medium">Account</div>
                                <div className="col-span-2 font-semibold text-slate-900">NexaSync Ltd</div>
                                
                                <div className="text-slate-500 font-medium">Number</div>
                                <div className="col-span-2 font-semibold text-slate-900 font-mono">123456789012</div>
                                
                                <div className="text-slate-500 font-medium">Reference</div>
                                <div className="col-span-2 font-bold text-blue-600">INV-{String(selectedInvoice?.id).padStart(4, "0")}</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label className="text-slate-900 font-semibold text-base">Upload Transfer Receipt</Label>
                            
                            <input 
                                type="file" 
                                className="hidden" 
                                ref={fileInputRef}
                                accept="image/*,.pdf"
                                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                            />

                            {!receiptFile ? (
                                <div 
                                    className="border-2 border-dashed border-slate-200 rounded-xl p-8 hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer text-center flex flex-col items-center justify-center"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <UploadCloud className="w-8 h-8 text-slate-400 mb-3" />
                                    <p className="font-medium text-slate-700">Click to upload receipt</p>
                                    <p className="text-xs text-slate-500 mt-1">PDF, JPG, or PNG</p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div className="truncate">
                                            <p className="text-sm font-semibold text-emerald-900 truncate">{receiptFile.name}</p>
                                            <p className="text-xs text-emerald-700 font-medium">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setReceiptFile(null)} className="flex-shrink-0 text-emerald-700 hover:bg-emerald-200/50">Remove</Button>
                                </div>
                            )}
                        </div>
                        
                        <Button 
                            className="w-full h-12 text-lg bg-slate-900 hover:bg-slate-800 text-white"
                            onClick={() => {
                                if (selectedInvoice && receiptFile) {
                                    bankUploadMutation.mutate({ invoiceId: selectedInvoice.id, file: receiptFile });
                                }
                            }}
                            disabled={!receiptFile || bankUploadMutation.isPending}
                        >
                            {bankUploadMutation.isPending ? "Uploading..." : "Submit Receipt for Verification"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </PortalLayout>
    );
}
