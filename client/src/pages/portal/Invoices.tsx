import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortalLayout } from "@/components/PortalLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Phone, Landmark } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function PortalInvoices() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    
    // Modal states
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [isMpesaOpen, setIsMpesaOpen] = useState(false);
    const [isBankOpen, setIsBankOpen] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState("");

    const mpesaMutation = useMutation({
        mutationFn: async (data: { invoiceId: number, phoneNumber: string }) => {
            const res = await apiRequest("POST", "/api/payments/mpesa/initiate", data);
            return res.json();
        },
        onSuccess: (data) => {
            toast({ title: "Payment Initiated", description: "Please check your phone for the STK prompt." });
            setIsMpesaOpen(false);
            queryClient.invalidateQueries({ queryKey: ["/api/portal/invoices"] });
        },
        onError: () => {
            toast({ title: "Payment Failed", description: "Failed to initiate M-Pesa payment.", variant: "destructive" });
        }
    });
    const { data: invoices = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/portal/invoices"],
        queryFn: () => fetch("/api/portal/invoices", { credentials: "include" }).then(r => r.json()),
    });

    return (
        <PortalLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-secondary">Invoices</h1>
                <p className="text-muted-foreground mt-1">View and download your billing history</p>
            </div>

            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8">Loading invoices...</TableCell></TableRow>
                        ) : invoices.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No invoices yet.</TableCell></TableRow>
                        ) : (
                            invoices.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-medium text-secondary">
                                        INV-{String(inv.id).padStart(4, "0")}
                                    </TableCell>
                                    <TableCell>${inv.amount.toLocaleString()}</TableCell>
                                    <TableCell>
                                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${inv.status === "paid" ? "bg-emerald-100 text-emerald-700" :
                                                inv.status === "overdue" ? "bg-red-100 text-red-700" :
                                                    "bg-amber-100 text-amber-700"
                                            }`}>
                                            {inv.status}
                                        </span>
                                    </TableCell>
                                    <TableCell>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "—"}</TableCell>
                                    <TableCell className="text-right">
                                        {(inv.status === "unpaid" || inv.status === "failed") ? (
                                            <div className="flex justify-end gap-2">
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                                                    onClick={() => {
                                                        setSelectedInvoice(inv);
                                                        setIsMpesaOpen(true);
                                                    }}
                                                >
                                                    <Phone className="w-4 h-4 mr-1" />
                                                    M-Pesa
                                                </Button>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline"
                                                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                                    onClick={() => {
                                                        setSelectedInvoice(inv);
                                                        setIsBankOpen(true);
                                                    }}
                                                >
                                                    <Landmark className="w-4 h-4 mr-1" />
                                                    Bank
                                                </Button>
                                            </div>
                                        ) : inv.status === "pending" ? (
                                            <span className="text-sm text-amber-600 font-medium">Processing...</span>
                                        ) : (
                                            <button className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium"
                                                onClick={() => {
                                                    alert(`Downloading PDF for INV-${String(inv.id).padStart(4, "0")}`);
                                                }}>
                                                <Download className="w-4 h-4" /> Receipt
                                            </button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* M-Pesa Payment Modal */}
            <Dialog open={isMpesaOpen} onOpenChange={setIsMpesaOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Pay via M-Pesa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input 
                                placeholder="eg. 254700000000" 
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                            />
                            <p className="text-sm text-muted-foreground">
                                Enter your M-Pesa registered number. An STK prompt will be sent to your phone.
                            </p>
                        </div>
                        <Button 
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => {
                                if (selectedInvoice && phoneNumber) {
                                    mpesaMutation.mutate({ invoiceId: selectedInvoice.id, phoneNumber });
                                }
                            }}
                            disabled={!phoneNumber || mpesaMutation.isPending}
                        >
                            {mpesaMutation.isPending ? "Initiating..." : `Pay $${selectedInvoice?.amount.toLocaleString()}`}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Bank Transfer Modal */}
            <Dialog open={isBankOpen} onOpenChange={setIsBankOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Bank Transfer Details</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-4 bg-slate-50 border rounded-lg text-sm space-y-2">
                            <p><span className="font-medium text-slate-500">Bank:</span> ABSA Bank Kenya</p>
                            <p><span className="font-medium text-slate-500">Account Name:</span> NexaSync Ltd</p>
                            <p><span className="font-medium text-slate-500">Account Number:</span> 2041234567</p>
                            <p><span className="font-medium text-slate-500">Branch Code:</span> 001</p>
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <p className="font-medium text-slate-900">
                                    Reference: INV-{String(selectedInvoice?.id).padStart(4, "0")}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Please use this reference when making the transfer so we can easily track your payment.
                                </p>
                            </div>
                        </div>
                        <Button 
                            className="w-full"
                            onClick={() => {
                                toast({
                                    title: "Instructions Sent",
                                    description: "Bank details have been emailed to you. Your invoice will be marked paid upon verification.",
                                });
                                setIsBankOpen(false);
                            }}
                        >
                            I Understand
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </PortalLayout>
    );
}
