import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Quote as QuoteIcon } from "lucide-react";

export default function AdminQuotes() {
    const qc = useQueryClient();
    const { data: quotes = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/quotes"],
        queryFn: () => fetch("/api/admin/quotes", { credentials: "include" }).then(r => r.json()),
    });

    const updateQuote = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            fetch(`/api/admin/quotes/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status }) }).then(r => r.json()),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/quotes"] }),
    });

    const convertQuote = useMutation({
        mutationFn: (id: number) =>
            fetch(`/api/admin/quotes/${id}/convert`, { method: "POST", credentials: "include" }).then(r => r.ok ? r.json() : Promise.reject(new Error("Failed to convert"))),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/quotes"] }),
    });

    const stColors: Record<string, string> = {
        pending: "bg-amber-100 text-amber-700",
        reviewed: "bg-blue-100 text-blue-700",
        accepted: "bg-emerald-100 text-emerald-700",
        approved: "bg-emerald-100 text-emerald-700",
        rejected: "bg-red-100 text-red-700",
    };

    return (
        <AdminLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-secondary">Quote Requests</h1>
                <p className="text-muted-foreground mt-1">Manage quote requests from potential clients.</p>
            </div>
            <div className="space-y-4 max-w-4xl">
                {quotes.length === 0 && (
                    <div className="bg-white rounded-2xl border border-dashed border-border p-16 text-center">
                        <QuoteIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-muted-foreground">No quotes yet. They'll appear when customers submit the quotation form.</p>
                    </div>
                )}
                {quotes.map((q: any) => (
                    <div key={q.id} className="bg-white rounded-2xl border border-border/50 shadow-sm p-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <p className="font-bold text-secondary">{q.name}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stColors[q.status] || "bg-slate-100 text-slate-600"}`}>{q.status}</span>
                                </div>
                                <p className="text-muted-foreground text-xs mb-2">{q.email} {q.phone ? `· ${q.phone}` : ""}</p>
                                <p className="text-secondary/80 text-sm mb-2">{q.projectDetails}</p>
                                {q.budget && <p className="text-xs text-muted-foreground">Budget: <span className="font-medium">{q.budget}</span></p>}
                                {q.timeline && <p className="text-xs text-muted-foreground">Timeline: <span className="font-medium">{q.timeline}</span></p>}
                                {q.estimatedPrice && <p className="text-sm font-semibold text-primary mt-1">Estimated: ${q.estimatedPrice.toLocaleString()}</p>}
                            </div>
                            <div className="shrink-0 flex flex-col gap-2 items-end">
                                <Select value={q.status} onValueChange={v => updateQuote.mutate({ id: q.id, status: v })}>
                                    <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {["pending", "reviewed", "accepted", "approved", "rejected"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                {q.status !== "approved" && (
                                    <Button
                                        size="sm"
                                        variant="default"
                                        className="w-full text-xs h-8"
                                        disabled={convertQuote.isPending}
                                        onClick={() => convertQuote.mutate(q.id)}
                                    >
                                        Create Project
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}
