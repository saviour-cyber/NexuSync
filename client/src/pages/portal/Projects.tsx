import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PortalLayout } from "@/components/PortalLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { FolderKanban, UploadCloud, MessageSquare, Download, FileText, CheckCircle2, File, Paperclip, Send, MilestoneIcon, ListChecks, ImageIcon } from "lucide-react";
import { io } from "socket.io-client";
import { useEffect } from "react";

type ProjectComment = { id: number; content: string; createdAt: string; userId: number };
type Milestone = { id: number; title: string; dueDate: string | null; completed: boolean; projectId: number };

export default function PortalProjects() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const chatFileRef = useRef<HTMLInputElement>(null);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isRequestOpen, setIsRequestOpen] = useState(false);
    const [requestForm, setRequestForm] = useState({ subject: "", message: "" });
    const [uploading, setUploading] = useState(false);

    const { data: projects = [], isLoading } = useQuery<any[]>({
        queryKey: ["/api/portal/projects"],
        queryFn: () => fetch("/api/portal/projects", { credentials: "include" }).then(r => r.json()),
    });

    const { data: files = [] } = useQuery<any[]>({
        queryKey: ["/api/portal/files", selectedProject?.id],
        queryFn: () => fetch(`/api/portal/files?projectId=${selectedProject?.id}`, { credentials: "include" }).then(r => r.json()),
        enabled: !!selectedProject,
    });

    const { data: requests = [] } = useQuery<any[]>({
        queryKey: ["/api/portal/update-requests", selectedProject?.id],
        queryFn: () => fetch(`/api/portal/update-requests?projectId=${selectedProject?.id}`, { credentials: "include" }).then(r => r.json()),
        enabled: !!selectedProject,
    });

    const { data: messages = [] } = useQuery<any[]>({
        queryKey: ["/api/projects", selectedProject?.id, "messages"],
        queryFn: () => fetch(`/api/projects/${selectedProject?.id}/messages`, { credentials: "include" }).then(r => r.json()),
        enabled: !!selectedProject,
    });

    const { data: milestones = [] } = useQuery<Milestone[]>({
        queryKey: ["/api/portal/milestones", selectedProject?.id],
        queryFn: () => fetch(`/api/portal/milestones?projectId=${selectedProject?.id}`, { credentials: "include" }).then(r => r.json()),
        enabled: !!selectedProject,
    });

    const [commentContent, setCommentContent] = useState("");
    const [typingUser, setTypingUser] = useState<string | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Socket.IO Setup
    useEffect(() => {
        if (!selectedProject?.id) return;

        const socket = io(window.location.origin, {
            path: "/socket.io"
        });

        socket.emit("joinProject", selectedProject.id);

        socket.on("receiveMessage", (newMessage) => {
            queryClient.setQueryData(["/api/projects", selectedProject.id, "messages"], (old: any[] = []) => {
                const exists = old.find(m => m.id === newMessage.id);
                if (exists) return old;
                return [...old, newMessage];
            });
            // Refresh project list to update unread counts
            queryClient.invalidateQueries({ queryKey: ["/api/portal/projects"] });
        });

        socket.on("userTyping", (data: { senderRole: string }) => {
            if (data.senderRole === "admin") setTypingUser("Admin");
        });

        socket.on("userStopTyping", () => {
            setTypingUser(null);
        });

        return () => {
            socket.disconnect();
        };
    }, [selectedProject?.id, queryClient]);

    const handleTyping = () => {
        if (!selectedProject?.id) return;
        const socket = io(window.location.origin, { path: "/socket.io" }); // Simplified for logic
        socket.emit("typing", { projectId: selectedProject.id, senderRole: "client" });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("stopTyping", { projectId: selectedProject.id, senderRole: "client" });
        }, 2000);
    };

    const sendMessageMut = useMutation({
        mutationFn: async ({ content, file }: { content: string, file?: File }) => {
            const fd = new FormData();
            fd.append("projectId", selectedProject.id.toString());
            fd.append("content", content);
            fd.append("senderRole", "client");
            if (file) fd.append("file", file);

            const r = await fetch("/api/messages", {
                method: "POST",
                body: fd,
                credentials: "include"
            });
            if (!r.ok) throw new Error("Failed to send message");
            return r.json();
        },
        onSuccess: () => {
            setCommentContent("");
            if (chatFileRef.current) chatFileRef.current.value = "";
        },
    });

    const uploadMut = useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("projectId", selectedProject.id.toString());
            const r = await fetch("/api/portal/files", { method: "POST", body: formData, credentials: "include" });
            if (!r.ok) throw new Error("Upload failed");
            return r.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/portal/files", selectedProject?.id] });
            toast({ title: "File uploaded successfully" });
            setIsUploadOpen(false);
        },
        onSettled: () => setUploading(false)
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploading(true);
            uploadMut.mutate(e.target.files[0]);
        }
    };

    const requestMut = useMutation({
        mutationFn: async (data: any) => {
            const r = await fetch("/api/portal/update-requests", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, projectId: selectedProject.id }),
                credentials: "include"
            });
            if (!r.ok) throw new Error("Request failed");
            return r.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/portal/update-requests", selectedProject?.id] });
            toast({ title: "Update request sent" });
            setIsRequestOpen(false);
            setRequestForm({ subject: "", message: "" });
        }
    });

    return (
        <PortalLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-secondary flex items-center gap-3">
                    <FolderKanban className="w-8 h-8 text-primary" /> My Projects
                </h1>
                <p className="text-muted-foreground mt-1">Track progress, share files, and request updates.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Project List */}
                <div className="lg:col-span-1 space-y-4">
                    {isLoading ? (
                        <p className="text-muted-foreground">Loading projects...</p>
                    ) : projects.length === 0 ? (
                        <p className="text-muted-foreground text-sm bg-white p-6 rounded-2xl border text-center">No active projects.</p>
                    ) : (
                        projects.map(p => (
                            <button
                                key={p.id}
                                onClick={() => setSelectedProject(p)}
                                className={`w-full text-left p-5 rounded-2xl border shadow-sm transition-all ${selectedProject?.id === p.id
                                    ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                                    : "bg-white hover:border-primary/40"
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-secondary text-lg leading-tight">{p.title}</h3>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.status === "active" ? "bg-emerald-100 text-emerald-700" :
                                            p.status === "completed" ? "bg-blue-100 text-blue-700" :
                                                "bg-slate-100 text-slate-600"
                                            }`}>
                                            {p.status}
                                        </span>
                                        {p.unreadCount > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] h-4 w-4 flex items-center justify-center rounded-full animate-bounce">
                                                {p.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
                                    <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${p.progress || 0}%` }} />
                                </div>
                                <p className="text-xs text-muted-foreground font-medium">{p.progress || 0}% Complete</p>
                            </button>
                        ))
                    )}
                </div>

                {/* Project Details */}
                <div className="lg:col-span-2">
                    {selectedProject ? (
                        <div className="bg-white rounded-2xl border shadow-sm p-6 min-h-[500px]">
                            <div className="flex justify-between items-start mb-6 pb-6 border-b">
                                <div>
                                    <h2 className="text-2xl font-bold text-secondary mb-2">{selectedProject.title}</h2>
                                    <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(true)}>
                                        <UploadCloud className="w-4 h-4 mr-2" /> Upload File
                                    </Button>
                                    <Button size="sm" onClick={() => setIsRequestOpen(true)}>
                                        <MessageSquare className="w-4 h-4 mr-2" /> Request Update
                                    </Button>
                                </div>
                            </div>

                            <Tabs defaultValue="milestones" className="w-full">
                                <TabsList className="grid w-full grid-cols-4 mb-6">
                                    <TabsTrigger value="milestones" className="gap-2"><MilestoneIcon className="w-4 h-4" /> Milestones</TabsTrigger>
                                    <TabsTrigger value="files" className="gap-2"><Paperclip className="w-4 h-4" /> Files</TabsTrigger>
                                    <TabsTrigger value="messages" className="gap-2"><MessageSquare className="w-4 h-4" /> Chat</TabsTrigger>
                                    <TabsTrigger value="requests" className="gap-2"><ListChecks className="w-4 h-4" /> Support</TabsTrigger>
                                </TabsList>

                                <TabsContent value="milestones" className="space-y-4">
                                    <div className="space-y-2">
                                        {milestones.map(m => (
                                            <div key={m.id} className="flex items-center justify-between p-3 bg-white border rounded-xl shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${m.completed ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                        {m.completed ? <CheckCircle2 className="w-4 h-4" /> : <div className="w-2 h-2 rounded-full bg-slate-300" />}
                                                    </div>
                                                    <span className={m.completed ? "text-muted-foreground line-through font-medium" : "font-semibold text-secondary"}>{m.title}</span>
                                                </div>
                                                {m.dueDate && <span className="text-xs font-semibold text-slate-500">Due {new Date(m.dueDate).toLocaleDateString()}</span>}
                                            </div>
                                        ))}
                                        {milestones.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Your project currently has no active milestones.</p>}
                                    </div>
                                </TabsContent>

                                <TabsContent value="files">
                                    {files.length === 0 ? (
                                        <div className="text-center py-12 px-4 rounded-xl border border-dashed bg-slate-50">
                                            <File className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                                            <p className="text-sm text-muted-foreground">No files shared yet.</p>
                                            <Button variant="ghost" className="text-primary hover:underline" onClick={() => setIsUploadOpen(true)}>Upload your first file</Button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {files.map(f => (
                                                <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl border bg-slate-50 group hover:border-primary/30 transition-colors">
                                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                        <Paperclip className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-semibold text-secondary truncate" title={f.originalName}>{f.originalName}</p>
                                                        <p className="text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(2)} MB • {new Date(f.createdAt).toLocaleDateString()}</p>
                                                    </div>
                                                    <a href={`/api/files/${f.id}/download`} className="p-2 hover:bg-white rounded-lg transition-colors text-muted-foreground hover:text-primary">
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>

                                <TabsContent value="messages">
                                    <div className="flex flex-col gap-3">
                                        {/* Messages area */}
                                        <div className="h-[400px] overflow-y-auto flex flex-col gap-4 p-4 bg-slate-50 rounded-xl border border-border/50">
                                            {messages.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center h-full text-center">
                                                    <MessageSquare className="w-10 h-10 text-slate-300 mb-3" />
                                                    <p className="text-sm font-semibold text-slate-500">No messages yet</p>
                                                    <p className="text-xs text-muted-foreground mt-1">Send a message below to start a conversation with the team.</p>
                                                </div>
                                            ) : (
                                                <>
                                                    {messages.map(m => {
                                                        const isMe = m.senderRole === "client";
                                                        return (
                                                            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                                                <div className={`max-w-[80%] space-y-2`}>
                                                                    <div className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${isMe ? "bg-primary text-white rounded-tr-sm" : "bg-white border text-secondary rounded-tl-sm"}`}>
                                                                        {m.content && <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>}

                                                                        {m.attachments && m.attachments.length > 0 && (
                                                                            <div className="mt-2 space-y-1">
                                                                                {m.attachments.map((a: any) => (
                                                                                    <a key={a.id} href={a.fileUrl} target="_blank" rel="noreferrer"
                                                                                        className={`flex items-center gap-2 p-2 rounded-lg text-xs border ${isMe ? "bg-white/10 border-white/20 hover:bg-white/20" : "bg-slate-50 border-slate-200 hover:bg-slate-100"}`}>
                                                                                        <Paperclip className="w-3 h-3" />
                                                                                        <span className="truncate max-w-[150px]">{a.fileName}</span>
                                                                                        <Download className="w-3 h-3 ml-auto opacity-60" />
                                                                                    </a>
                                                                                ))}
                                                                            </div>
                                                                        )}

                                                                        <span className={`text-[10px] mt-1 block font-mono ${isMe ? "text-white/60 text-right" : "text-muted-foreground"}`}>
                                                                            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                    {typingUser && (
                                                        <div className="flex justify-start">
                                                            <div className="bg-slate-200/50 px-3 py-1.5 rounded-full text-[10px] text-muted-foreground animate-pulse flex items-center gap-2">
                                                                <div className="flex gap-1">
                                                                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                                                                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                                                                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                                                                </div>
                                                                Admin is typing...
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        {/* Input bar */}
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Input
                                                        placeholder="Type a message to the team..."
                                                        value={commentContent}
                                                        onChange={e => {
                                                            setCommentContent(e.target.value);
                                                            handleTyping();
                                                        }}
                                                        onKeyDown={e => {
                                                            if (e.key === "Enter" && !e.shiftKey && commentContent.trim()) {
                                                                e.preventDefault();
                                                                sendMessageMut.mutate({ content: commentContent });
                                                            }
                                                        }}
                                                        className="pr-10"
                                                    />
                                                    <button
                                                        onClick={() => chatFileRef.current?.click()}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                                                    >
                                                        <Paperclip className="w-4 h-4" />
                                                    </button>
                                                    <input type="file" ref={chatFileRef} className="hidden" onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            sendMessageMut.mutate({ content: commentContent, file });
                                                        }
                                                    }} />
                                                </div>
                                                <Button
                                                    onClick={() => { if (commentContent.trim()) sendMessageMut.mutate({ content: commentContent }); }}
                                                    disabled={sendMessageMut.isPending || (!commentContent.trim() && !chatFileRef.current?.files?.length)}
                                                    className="gap-2 px-6"
                                                >
                                                    {sendMessageMut.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                                                    Send
                                                </Button>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground text-center italic">Professional real-time communication powered by NexaSync Messaging™</p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="requests">

                                    {requests.length === 0 ? (
                                        <div className="text-center py-12 px-4 rounded-xl border border-dashed bg-slate-50">
                                            <ListChecks className="w-8 h-8 mx-auto text-slate-300 mb-3" />
                                            <p className="text-sm text-muted-foreground">No update requests found.</p>
                                            <Button variant="ghost" className="text-primary hover:underline" onClick={() => setIsRequestOpen(true)}>Submit a new request for features or edits</Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {requests.map(r => (
                                                <div key={r.id} className="p-4 rounded-xl border bg-white shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-secondary">{r.subject}</h4>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'replied' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                            {r.status === 'replied' ? 'Answered' : 'Pending'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap">{r.message}</p>

                                                    {r.adminReply && (
                                                        <div className="mt-4 p-3 bg-primary/5 border border-primary/10 rounded-lg">
                                                            <p className="text-xs font-bold uppercase tracking-wider text-primary mb-1">Response</p>
                                                            <p className="text-sm text-secondary">{r.adminReply}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </div>
                    ) : (
                        <div className="bg-slate-50 rounded-2xl border border-dashed flex items-center justify-center p-12 h-[500px]">
                            <div className="text-center w-full max-w-sm">
                                <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-4">
                                    <FolderKanban className="w-8 h-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-bold text-secondary mb-2">Select a Project</h3>
                                <p className="text-sm text-muted-foreground">Click on a project from the list to view its repository, uploaded files, and request detailed updates.</p>
                            </div>
                        </div>
                    )
                    }
                </div >
            </div >

            {/* Upload Dialog */}
            < Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen} >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Upload Project Document</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-slate-50 transition-colors hover:bg-slate-100 hover:border-primary/50 cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}>
                        {uploading ? (
                            <div className="flex flex-col items-center">
                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                                <p className="text-sm font-medium text-secondary">Uploading file...</p>
                            </div>
                        ) : (
                            <>
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-3">
                                    <UploadCloud className="w-6 h-6 text-primary" />
                                </div>
                                <p className="text-sm font-semibold text-secondary mb-1">Click to upload or drag and drop</p>
                                <p className="text-xs text-muted-foreground">PDF, JPG, PNG, DOC (max. 10MB)</p>
                            </>
                        )}
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} disabled={uploading} />
                    </div>
                </DialogContent>
            </Dialog >

            {/* Request Update Dialog */}
            < Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Request Project Update</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-secondary block mb-1">Subject</label>
                            <Input
                                placeholder="e.g. Design revisions needed"
                                value={requestForm.subject}
                                onChange={e => setRequestForm(f => ({ ...f, subject: e.target.value }))}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-secondary block mb-1">Message</label>
                            <Textarea
                                placeholder="Describe the update you need..."
                                className="min-h-[120px]"
                                value={requestForm.message}
                                onChange={e => setRequestForm(f => ({ ...f, message: e.target.value }))}
                            />
                        </div>
                        <Button
                            className="w-full"
                            disabled={!requestForm.subject || !requestForm.message || requestMut.isPending}
                            onClick={() => requestMut.mutate(requestForm)}
                        >
                            {requestMut.isPending ? "Sending..." : "Submit Request"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog >
        </PortalLayout >
    );
}
