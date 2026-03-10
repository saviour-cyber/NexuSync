import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, Paperclip, ChevronRight } from "lucide-react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/lib/auth";

export default function AdminConversations() {
    const { user } = useAuth();
    const qc = useQueryClient();
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [message, setMessage] = useState("");
    const [liveMessages, setLiveMessages] = useState<any[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    const { data: projects = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/projects"],
        queryFn: () => fetch("/api/admin/projects", { credentials: "include" }).then(r => r.json()),
    });

    const { data: messages = [], isSuccess } = useQuery<any[]>({
        queryKey: ["/api/projects/messages", selectedProjectId],
        queryFn: () => fetch(`/api/projects/${selectedProjectId}/messages`, { credentials: "include" }).then(r => r.json()),
        enabled: !!selectedProjectId,
    });

    useEffect(() => {
        if (isSuccess) setLiveMessages(messages);
    }, [messages, isSuccess]);

    useEffect(() => {
        if (!selectedProjectId) return;

        if (!socketRef.current) {
            socketRef.current = io({ path: "/socket.io" });
        }
        const socket = socketRef.current;
        socket.emit("joinProject", selectedProjectId);
        socket.on("receiveMessage", (msg: any) => {
            setLiveMessages(prev => [...prev, msg]);
            qc.invalidateQueries({ queryKey: ["/api/admin/projects"] });
        });
        return () => { socket.off("receiveMessage"); };
    }, [selectedProjectId]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [liveMessages]);

    const sendMessage = () => {
        if (!message.trim() || !selectedProjectId || !socketRef.current) return;
        socketRef.current.emit("sendMessage", {
            projectId: selectedProjectId,
            content: message.trim(),
            senderRole: "admin",
            senderId: user?.id,
        });
        setMessage("");
    };

    const selectedProject = projects.find((p: any) => p.id === selectedProjectId);

    return (
        <AdminLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-secondary">Conversations</h1>
                <p className="text-muted-foreground mt-1">Real-time messaging with clients per project.</p>
            </div>

            <div className="flex gap-4 h-[calc(100vh-220px)] bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                {/* Project List */}
                <div className="w-72 border-r border-border/50 flex flex-col">
                    <div className="p-4 border-b border-border/50 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Projects</div>
                    <div className="flex-1 overflow-y-auto">
                        {projects.length === 0 && (
                            <div className="p-6 text-center text-muted-foreground text-sm">No projects yet.</div>
                        )}
                        {projects.map((p: any) => (
                            <button
                                key={p.id}
                                onClick={() => { setSelectedProjectId(p.id); setLiveMessages([]); }}
                                className={`w-full text-left px-4 py-3.5 border-b border-border/30 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 ${selectedProjectId === p.id ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
                            >
                                <div className="min-w-0">
                                    <p className="font-medium text-secondary text-sm truncate">{p.title}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{p.status}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    {p.unreadCount > 0 && (
                                        <span className="bg-primary text-white text-xs rounded-full px-1.5 py-0.5 font-bold">{p.unreadCount}</span>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat Panel */}
                <div className="flex-1 flex flex-col">
                    {!selectedProjectId ? (
                        <div className="flex-1 flex items-center justify-center text-center">
                            <div>
                                <MessageSquare className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
                                <p className="text-muted-foreground">Select a project to view conversation</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="p-4 border-b border-border/50 font-semibold text-secondary">
                                {selectedProject?.title}
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {liveMessages.map((m: any) => (
                                    <div key={m.id} className={`flex ${m.senderRole === "admin" ? "justify-end" : "justify-start"}`}>
                                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${m.senderRole === "admin"
                                            ? "bg-primary text-white rounded-tr-sm"
                                            : "bg-slate-100 text-secondary rounded-tl-sm"}`}>
                                            <p>{m.content}</p>
                                            <p className={`text-xs mt-1 ${m.senderRole === "admin" ? "text-white/60" : "text-muted-foreground"}`}>
                                                {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={bottomRef} />
                            </div>
                            <div className="p-4 border-t border-border/50 flex gap-2">
                                <input
                                    className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    placeholder="Type a message..."
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && sendMessage()}
                                />
                                <Button onClick={sendMessage} className="rounded-xl gap-2">
                                    <Send className="w-4 h-4" /> Send
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
