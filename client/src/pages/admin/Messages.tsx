import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCheck } from "lucide-react";

export default function AdminMessages() {
    const qc = useQueryClient();
    const { data: messages = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/messages"],
        queryFn: () => fetch("/api/admin/messages", { credentials: "include" }).then(r => r.json()),
    });

    const markRead = useMutation({
        mutationFn: (id: number) => fetch(`/api/admin/messages/${id}/read`, { method: "PUT", credentials: "include" }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/messages"] }),
    });

    const unread = messages.filter((m: any) => !m.read);
    const read = messages.filter((m: any) => m.read);

    return (
        <AdminLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-secondary">Messages</h1>
                <p className="text-muted-foreground mt-1">{unread.length} unread message{unread.length !== 1 ? "s" : ""}.</p>
            </div>

            <div className="space-y-3 max-w-3xl">
                {messages.length === 0 && (
                    <div className="bg-white rounded-2xl border border-dashed border-border p-16 text-center">
                        <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-muted-foreground">No messages yet. They'll appear here when visitors submit the contact form.</p>
                    </div>
                )}
                {[...unread, ...read].map((m: any) => (
                    <div key={m.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${!m.read ? "border-primary/30 bg-blue-50/30" : "border-border/50"}`}>
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                    {m.name[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="font-bold text-secondary">{m.name}</p>
                                        {!m.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                                    </div>
                                    <p className="text-muted-foreground text-xs mb-1">{m.email} {m.phone && `· ${m.phone}`}</p>
                                    <p className="text-secondary/80 text-sm">{m.message}</p>
                                    <p className="text-muted-foreground text-xs mt-2">{m.createdAt ? new Date(m.createdAt).toLocaleString() : ""}</p>
                                </div>
                            </div>
                            {!m.read && (
                                <Button size="sm" variant="outline" onClick={() => markRead.mutate(m.id)} className="shrink-0 gap-1.5 text-xs">
                                    <CheckCheck className="w-3 h-3" /> Mark Read
                                </Button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}
