import { useQuery } from "@tanstack/react-query";
import { PortalLayout } from "@/components/PortalLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download } from "lucide-react";

export default function PortalInvoices() {
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
                                        <button className="text-primary hover:text-primary/80 inline-flex items-center gap-1 text-sm font-medium"
                                            onClick={() => {
                                                // Stub download action for demo
                                                alert(`Downloading PDF for INV-${String(inv.id).padStart(4, "0")}`);
                                            }}>
                                            <Download className="w-4 h-4" /> Download
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </PortalLayout>
    );
}
