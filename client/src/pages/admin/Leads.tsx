import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { MessageSquare, Phone, User as UserIcon, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type WhatsappLead = {
    id: number;
    name: string;
    phone: string;
    service: string | null;
    message: string | null;
    status: string;
    createdAt: string;
};

export default function AdminLeads() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const { data: leads, isLoading } = useQuery<WhatsappLead[]>({
        queryKey: ["/api/admin/leads"],
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: number, status: string }) => {
            const res = await fetch(`/api/admin/leads/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });
            if (!res.ok) throw new Error("Failed to update status");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
            toast({ title: "Status updated" });
        },
        onError: () => {
            toast({ title: "Failed to update status", variant: "destructive" });
        }
    });

    const convertLeadMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/admin/leads/${id}/convert`, { method: "POST" });
            if (!res.ok) throw new Error("Failed to convert lead to quote");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/leads"] });
            toast({ title: "Lead Converted", description: "A new Quote has been generated." });
        },
        onError: () => {
            toast({ title: "Conversion failed", variant: "destructive" });
        }
    });

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">WhatsApp Leads</h2>
                    <p className="text-muted-foreground">Manage service inquiries from WhatsApp.</p>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Interest</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[1, 2, 3].map(i => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">WhatsApp Leads</h2>
                <p className="text-muted-foreground">Manage service inquiries from WhatsApp.</p>
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Interest</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {leads?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    No leads captured yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            leads?.map((lead) => (
                                <TableRow key={lead.id}>
                                    <TableCell className="whitespace-nowrap">
                                        {format(new Date(lead.createdAt), "MMM d, yyyy")}
                                        <div className="text-xs text-muted-foreground">
                                            {format(new Date(lead.createdAt), "h:mm a")}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <div className="font-medium flex items-center gap-2">
                                                <UserIcon className="w-3 h-3 text-muted-foreground" />
                                                {lead.name}
                                            </div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Phone className="w-3 h-3" />
                                                {lead.phone}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4 text-primary" />
                                            <span className="font-medium">{lead.service || "General Inquiry"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            value={lead.status}
                                            onValueChange={(val) => updateStatusMutation.mutate({ id: lead.id, status: val })}
                                        >
                                            <SelectTrigger className="w-[130px] h-8 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="new">
                                                    <div className="flex items-center gap-2"><Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-50">New</Badge></div>
                                                </SelectItem>
                                                <SelectItem value="contacted">
                                                    <div className="flex items-center gap-2"><Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">Contacted</Badge></div>
                                                </SelectItem>
                                                <SelectItem value="closed">
                                                    <div className="flex items-center gap-2"><Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Closed</Badge></div>
                                                </SelectItem>
                                                <SelectItem value="converted">
                                                    <div className="flex items-center gap-2"><Badge variant="outline" className="bg-violet-50 text-violet-700 hover:bg-violet-50">Converted</Badge></div>
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => window.open(`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`, '_blank')}
                                            >
                                                <MessageSquare className="w-4 h-4 text-[#25D366]" /> Reply
                                            </Button>
                                            {lead.status !== "converted" && lead.status !== "closed" && (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="gap-2"
                                                    disabled={convertLeadMutation.isPending}
                                                    onClick={() => convertLeadMutation.mutate(lead.id)}
                                                >
                                                    <FileText className="w-4 h-4" /> Quote
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
