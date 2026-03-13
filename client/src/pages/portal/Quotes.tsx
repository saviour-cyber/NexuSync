import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortalLayout } from "@/components/PortalLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileText, CheckCircle, XCircle, Clock, ChevronRight, FolderKanban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Quote = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    projectDetails: string;
    budget: string | null;
    timeline: string | null;
    status: string;
    estimatedPrice: number | null;
    createdAt: string;
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    pending: { label: "Awaiting Review", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
    approved: { label: "Approved", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
    "request-changes": { label: "Changes Requested", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
};

export default function PortalQuotes() {
    const { toast } = useToast();
    const qc = useQueryClient();
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const { data: quotes = [], isLoading } = useQuery<Quote[]>({
        queryKey: ["/api/portal/quotes"],
        queryFn: () => fetch("/api/portal/quotes", { credentials: "include" }).then(r => r.json()),
    });

    const approveMut = useMutation({
        mutationFn: (id: number) =>
            fetch(`/api/portal/quotes/${id}/approve`, { method: "POST", credentials: "include" }).then(async r => {
                if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
                return r.json();
            }),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ["/api/portal/quotes"] });
            qc.invalidateQueries({ queryKey: ["/api/portal/projects"] });
            toast({
                title: "✅ Quote Approved!",
                description: `Project "${data.project.title}" has been automatically created for you.`,
            });
        },
        onError: (err: any) => toast({ title: "Approval failed", description: err.message, variant: "destructive" }),
    });

    const rejectMut = useMutation({
        mutationFn: (id: number) =>
            fetch(`/api/portal/quotes/${id}/reject`, { method: "POST", credentials: "include" }).then(async r => {
                if (!r.ok) { const e = await r.json(); throw new Error(e.message); }
                return r.json();
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["/api/portal/quotes"] });
            toast({ title: "Quote rejected", description: "We have noted your response." });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });

    return (
        <PortalLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-secondary flex items-center gap-3">
                    <FileText className="w-8 h-8 text-primary" /> My Quotes
                </h1>
                <p className="text-muted-foreground mt-1">Review and respond to quotes sent by our team.</p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-48">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
            ) : quotes.length === 0 ? (
                <div className="bg-white border border-dashed rounded-2xl p-16 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-secondary mb-2">No quotes yet</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Once our team prepares a quote for your project, it will appear here for your review.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <AnimatePresence>
                        {quotes.map(q => {
                            const cfg = statusConfig[q.status] ?? statusConfig.pending;
                            const StatusIcon = cfg.icon;
                            const isOpen = expandedId === q.id;
                            const isPending = q.status === "pending";

                            return (
                                <motion.div
                                    key={q.id}
                                    layout
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white border border-border/50 rounded-2xl shadow-sm overflow-hidden"
                                >
                                    {/* Header row */}
                                    <button
                                        className="w-full text-left p-5 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                                        onClick={() => setExpandedId(isOpen ? null : q.id)}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                                <FileText className="w-5 h-5 text-primary" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-secondary truncate">
                                                    {q.projectDetails.slice(0, 60)}{q.projectDetails.length > 60 ? "..." : ""}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Submitted {new Date(q.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            {q.estimatedPrice != null && (
                                                <span className="text-lg font-bold text-secondary">
                                                    KSh {q.estimatedPrice.toLocaleString()}
                                                </span>
                                            )}
                                            <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${cfg.color}`}>
                                                <StatusIcon className="w-3.5 h-3.5" />
                                                {cfg.label}
                                            </span>
                                            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
                                        </div>
                                    </button>

                                    {/* Expanded details */}
                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-5 pb-5 space-y-5 border-t border-border/50 pt-5">
                                                    {/* Details grid */}
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {[
                                                            { label: "Budget", value: q.budget || "Not specified" },
                                                            { label: "Timeline", value: q.timeline || "Not specified" },
                                                            { label: "Estimate", value: q.estimatedPrice ? `KSh ${q.estimatedPrice.toLocaleString()}` : "Pending" },
                                                            { label: "Status", value: cfg.label },
                                                        ].map(({ label, value }) => (
                                                            <div key={label} className="bg-slate-50 rounded-xl p-3">
                                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
                                                                <p className="text-sm font-bold text-secondary mt-1">{value}</p>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Project details */}
                                                    <div>
                                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Project Details</p>
                                                        <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 whitespace-pre-wrap leading-relaxed">
                                                            {q.projectDetails}
                                                        </p>
                                                    </div>

                                                    {/* Approved notice */}
                                                    {q.status === "approved" && (
                                                        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                                            <FolderKanban className="w-5 h-5 text-emerald-600 shrink-0" />
                                                            <div>
                                                                <p className="text-sm font-bold text-emerald-800">Project Created!</p>
                                                                <p className="text-xs text-emerald-700">A project was automatically created. Visit <strong>My Projects</strong> to view it.</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Action buttons — only for pending quotes */}
                                                    {isPending && (
                                                        <div className="flex flex-wrap gap-3 pt-1">
                                                            <Button
                                                                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                onClick={() => approveMut.mutate(q.id)}
                                                                disabled={approveMut.isPending}
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                                {approveMut.isPending ? "Approving..." : "Approve Quote"}
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                                                                onClick={() => rejectMut.mutate(q.id)}
                                                                disabled={rejectMut.isPending}
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                                {rejectMut.isPending ? "Rejecting..." : "Request Changes"}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </PortalLayout>
    );
}
