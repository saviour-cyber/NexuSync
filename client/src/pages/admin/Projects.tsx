import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, X, Check, FolderKanban, CalendarDays, ListChecks, MessageSquare, Paperclip, Milestone as MilestoneIcon, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type Project = { id: number; title: string; description?: string | null; status: string; clientId?: number | null; progress?: number | null; deadline?: any; budget?: number | null };
type Task = { id: number; title: string; status: string; priority: string; projectId?: number | null };
type ProjectComment = { id: number; content: string; createdAt: string; userId: number };
type ProjectFile = { id: number; originalName: string; size: number; createdAt: string; fileName: string };
type Milestone = { id: number; title: string; dueDate: string | null; completed: boolean; projectId: number };

const statusColors: Record<string, string> = {
    "active": "bg-emerald-100 text-emerald-700",
    "completed": "bg-blue-100 text-blue-700",
    "on-hold": "bg-amber-100 text-amber-700",
    "cancelled": "bg-red-100 text-red-700",
};

const taskStatusColors: Record<string, string> = {
    "todo": "bg-slate-100 text-slate-600",
    "in-progress": "bg-blue-100 text-blue-700",
    "done": "bg-emerald-100 text-emerald-700",
};

export default function AdminProjects() {
    const qc = useQueryClient();
    const { toast } = useToast();
    const [showForm, setShowForm] = useState(false);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [taskTitle, setTaskTitle] = useState("");
    const [milestoneTitle, setMilestoneTitle] = useState("");
    const [commentContent, setCommentContent] = useState("");
    const chatFileRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState({ title: "", description: "", status: "active", progress: 0, budget: 0 });

    const { data: projects = [] } = useQuery<Project[]>({
        queryKey: ["/api/admin/projects"],
        queryFn: () => fetch("/api/admin/projects", { credentials: "include" }).then(r => r.json()),
    });

    const { data: allTasks = [] } = useQuery<Task[]>({
        queryKey: ["/api/admin/tasks"],
        queryFn: () => fetch("/api/admin/tasks", { credentials: "include" }).then(r => r.json()),
    });

    const createProject = useMutation({
        mutationFn: (d: any) => fetch("/api/admin/projects", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(d) }).then(r => r.json()),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/projects"] }); setShowForm(false); setForm({ title: "", description: "", status: "active", progress: 0, budget: 0 }); },
    });

    const updateProject = useMutation({
        mutationFn: ({ id, ...d }: any) => fetch(`/api/admin/projects/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(d) }).then(r => r.json()),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/projects"] }),
    });

    const deleteProject = useMutation({
        mutationFn: (id: number) => fetch(`/api/admin/projects/${id}`, { method: "DELETE", credentials: "include" }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/projects"] }); setSelectedProject(null); },
    });

    const createTask = useMutation({
        mutationFn: (d: any) => fetch("/api/admin/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(d) }).then(r => r.json()),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/tasks"] }); setTaskTitle(""); },
    });

    const updateTask = useMutation({
        mutationFn: ({ id, ...d }: any) => fetch(`/api/admin/tasks/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(d) }).then(r => r.json()),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/tasks"] }),
    });

    const [typingUser, setTypingUser] = useState<string | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const projectTasks = allTasks.filter(t => t.projectId === selectedProject?.id);
    const projectId = selectedProject?.id;

    const { data: messages = [] } = useQuery<any[]>({
        queryKey: ["/api/projects", selectedProject?.id, "messages"],
        queryFn: () => projectId ? fetch(`/api/projects/${projectId}/messages`, { credentials: "include" }).then(r => r.json()) : Promise.resolve([]),
        enabled: !!projectId,
    });

    const { data: files = [] } = useQuery<ProjectFile[]>({
        queryKey: ["/api/admin/files", projectId],
        queryFn: () => projectId ? fetch(`/api/admin/files?projectId=${projectId}`, { credentials: "include" }).then(r => r.json()) : Promise.resolve([]),
        enabled: !!projectId,
    });

    const { data: milestones = [] } = useQuery<Milestone[]>({
        queryKey: ["/api/admin/milestones", projectId],
        queryFn: () => projectId ? fetch(`/api/admin/milestones?projectId=${projectId}`, { credentials: "include" }).then(r => r.json()) : Promise.resolve([]),
        enabled: !!projectId,
    });

    // Socket.IO Setup
    useEffect(() => {
        if (!selectedProject?.id) return;

        const socket = io(window.location.origin, {
            path: "/socket.io"
        });

        socket.emit("joinProject", selectedProject.id);

        socket.on("receiveMessage", (newMessage) => {
            qc.setQueryData(["/api/projects", selectedProject.id, "messages"], (old: any[] = []) => {
                const exists = old.find(m => m.id === newMessage.id);
                if (exists) return old;
                return [...old, newMessage];
            });
            // Refresh project list to update unread counts
            qc.invalidateQueries({ queryKey: ["/api/admin/projects"] });
        });

        socket.on("userTyping", (data: { senderRole: string }) => {
            if (data.senderRole === "client") setTypingUser("Client");
        });

        socket.on("userStopTyping", () => {
            setTypingUser(null);
        });

        return () => {
            socket.disconnect();
        };
    }, [selectedProject?.id, qc]);

    const handleTyping = () => {
        if (!selectedProject?.id) return;
        const socket = io(window.location.origin, { path: "/socket.io" });
        socket.emit("typing", { projectId: selectedProject.id, senderRole: "admin" });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit("stopTyping", { projectId: selectedProject.id, senderRole: "admin" });
        }, 2000);
    };

    const sendMessageMut = useMutation({
        mutationFn: async ({ content, file }: { content: string, file?: File }) => {
            const fd = new FormData();
            fd.append("projectId", selectedProject!.id.toString());
            fd.append("content", content);
            fd.append("senderRole", "admin");
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

    const createFile = useMutation({
        mutationFn: (formData: FormData) => fetch("/api/admin/files", { method: "POST", credentials: "include", body: formData }).then(r => r.json()),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/files", projectId] }),
    });

    const deleteFile = useMutation({
        mutationFn: (id: number) => fetch(`/api/admin/files/${id}`, { method: "DELETE", credentials: "include" }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/files", projectId] }),
    });

    const createInvoiceMut = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/admin/projects/${id}/invoice`, { method: "POST" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to generate invoice");
            }
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Invoice Generated", description: "Successfully created an invoice for this project." });
        },
        onError: (error: any) => {
            toast({ title: "Failed to generate", description: error.message, variant: "destructive" });
        }
    });

    const createMilestone = useMutation({
        mutationFn: (title: string) => fetch("/api/admin/milestones", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ projectId, title, completed: false }) }).then(r => r.json()),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/milestones", projectId] }); setMilestoneTitle(""); },
    });

    const updateMilestone = useMutation({
        mutationFn: ({ id, completed }: any) => fetch(`/api/admin/milestones/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ completed }) }).then(r => r.json()),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/milestones", projectId] }),
    });

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-secondary">Projects</h1>
                    <p className="text-muted-foreground mt-1">Track projects, tasks, and client work.</p>
                </div>
                <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="w-4 h-4" /> New Project</Button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-6">
                        <div className="bg-white rounded-2xl border border-border/50 shadow-lg p-6">
                            <h3 className="font-bold text-secondary mb-4">New Project</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div><Label>Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" /></div>
                                <div><Label>Status</Label>
                                    <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {["active", "on-hold", "completed", "cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Budget (KSh)</Label><Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: parseInt(e.target.value) || 0 }))} className="mt-1" /></div>
                                <div><Label>Progress (%)</Label><Input type="number" min={0} max={100} value={form.progress} onChange={e => setForm(f => ({ ...f, progress: parseInt(e.target.value) || 0 }))} className="mt-1" /></div>
                                <div className="md:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" /></div>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={() => createProject.mutate(form)} disabled={createProject.isPending} className="gap-2"><Check className="w-4 h-4" /> Create</Button>
                                <Button variant="outline" onClick={() => setShowForm(false)} className="gap-2"><X className="w-4 h-4" /> Cancel</Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Project list */}
                <div className="space-y-4">
                    {projects.map(p => (
                        <motion.div key={p.id} layout
                            onClick={() => setSelectedProject(p)}
                            className={`bg-white rounded-2xl border shadow-sm p-5 cursor-pointer transition-all hover:shadow-md ${selectedProject?.id === p.id ? "border-primary" : "border-border/50"}`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <FolderKanban className="w-5 h-5 text-primary" />
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[p.status] || "bg-slate-100"}`}>{p.status}</span>
                                    {(p as any).unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] h-4 w-4 flex items-center justify-center rounded-full animate-bounce">
                                            {(p as any).unreadCount}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <h3 className="font-bold text-secondary mb-2">{p.title}</h3>
                            {p.description && <p className="text-muted-foreground text-xs mb-3 line-clamp-2">{p.description}</p>}
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                                <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${p.progress || 0}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                <span>{allTasks.filter(t => t.projectId === p.id && t.status === "done").length}/{allTasks.filter(t => t.projectId === p.id).length} tasks</span>
                                <span>{p.progress || 0}%</span>
                            </div>
                        </motion.div>
                    ))}
                    {!projects.length && <p className="text-muted-foreground text-sm text-center py-8 bg-white rounded-2xl border border-border/50">No projects yet.</p>}
                </div>

                {/* Task board */}
                <div className="lg:col-span-2">
                    {selectedProject ? (
                        <div className="bg-white rounded-2xl border border-border/50 shadow-sm">
                            <div className="p-6 border-b border-border/50 flex items-start justify-between">
                                <div>
                                    <h2 className="font-bold text-secondary text-xl">{selectedProject.title}</h2>
                                    <p className="text-muted-foreground text-sm">{selectedProject.description}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => createInvoiceMut.mutate(selectedProject.id)}
                                        disabled={createInvoiceMut.isPending}
                                    >
                                        <FileText className="w-4 h-4" /> Invoice
                                    </Button>
                                    <Select value={selectedProject.status} onValueChange={v => { updateProject.mutate({ id: selectedProject.id, status: v }); setSelectedProject(p => p ? ({ ...p, status: v }) : null); }}>
                                        <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
                                        <SelectContent>{["active", "on-hold", "completed", "cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Button variant="outline" size="sm" onClick={() => deleteProject.mutate(selectedProject.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="p-6">
                                <Tabs defaultValue="tasks" className="w-full">
                                    <TabsList className="grid w-full grid-cols-4 mb-6">
                                        <TabsTrigger value="tasks" className="gap-2"><ListChecks className="w-4 h-4" /> Tasks</TabsTrigger>
                                        <TabsTrigger value="milestones" className="gap-2"><MilestoneIcon className="w-4 h-4" /> Milestones</TabsTrigger>
                                        <TabsTrigger value="files" className="gap-2"><Paperclip className="w-4 h-4" /> Files</TabsTrigger>
                                        <TabsTrigger value="messages" className="gap-2"><MessageSquare className="w-4 h-4" /> Messages</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="tasks" className="space-y-4">
                                        <div className="flex gap-2 mb-4">
                                            <Input placeholder="Add a task..." value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                                                onKeyDown={e => { if (e.key === "Enter" && taskTitle.trim()) createTask.mutate({ title: taskTitle, projectId: selectedProject.id, status: "todo", priority: "medium" }); }}
                                                className="flex-1"
                                            />
                                            <Button onClick={() => { if (taskTitle.trim()) createTask.mutate({ title: taskTitle, projectId: selectedProject.id, status: "todo", priority: "medium" }); }}>
                                                <Plus className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {(["todo", "in-progress", "done"] as const).map(col => (
                                                <div key={col} className="bg-slate-50 rounded-xl p-4">
                                                    <h3 className="font-semibold text-sm text-secondary mb-3 capitalize flex items-center gap-2">
                                                        <ListChecks className="w-4 h-4" />
                                                        {col.replace("-", " ")} ({projectTasks.filter(t => t.status === col).length})
                                                    </h3>
                                                    <div className="space-y-2">
                                                        {projectTasks.filter(t => t.status === col).map(t => (
                                                            <div key={t.id} className="bg-white rounded-lg p-3 border border-border/50 shadow-sm">
                                                                <p className="text-sm font-medium text-secondary">{t.title}</p>
                                                                <div className="flex gap-1 mt-2">
                                                                    {(["todo", "in-progress", "done"] as const).filter(s => s !== t.status).map(s => (
                                                                        <button key={s} onClick={() => updateTask.mutate({ id: t.id, status: s })}
                                                                            className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 hover:bg-primary/10 hover:text-primary transition-colors font-medium">
                                                                            → {s.replace("-", " ")}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="milestones" className="space-y-4">
                                        <div className="flex gap-2 mb-4">
                                            <Input placeholder="Add milestone..." value={milestoneTitle} onChange={e => setMilestoneTitle(e.target.value)}
                                                onKeyDown={e => { if (e.key === "Enter" && milestoneTitle.trim()) createMilestone.mutate(milestoneTitle); }}
                                            />
                                            <Button onClick={() => { if (milestoneTitle.trim()) createMilestone.mutate(milestoneTitle); }}><Plus className="w-4 h-4" /></Button>
                                        </div>
                                        <div className="space-y-2">
                                            {milestones.map(m => (
                                                <div key={m.id} className="flex items-center justify-between p-3 bg-white border rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <input type="checkbox" checked={m.completed} onChange={e => updateMilestone.mutate({ id: m.id, completed: e.target.checked })} className="w-5 h-5 accent-primary" />
                                                        <span className={m.completed ? "line-through text-muted-foreground" : "font-medium"}>{m.title}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {milestones.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No milestones defined.</p>}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="files" className="space-y-4">
                                        <div className="flex items-center gap-4 mb-4">
                                            <Input type="file" onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (!file || !projectId) return;
                                                const fd = new FormData();
                                                fd.append("file", file);
                                                fd.append("projectId", String(projectId));
                                                createFile.mutate(fd);
                                            }} />
                                        </div>
                                        <div className="space-y-2">
                                            {files.map(f => (
                                                <div key={f.id} className="flex items-center justify-between p-3 bg-white border rounded-xl">
                                                    <div className="flex items-center gap-3">
                                                        <Paperclip className="w-5 h-5 text-muted-foreground" />
                                                        <div>
                                                            <p className="text-sm font-medium"><a href={`/uploads/${f.fileName}`} download className="hover:underline">{f.originalName}</a></p>
                                                            <p className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB • {format(new Date(f.createdAt), "MMM d")}</p>
                                                        </div>
                                                    </div>
                                                    <Button variant="ghost" size="sm" onClick={() => deleteFile.mutate(f.id)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                                </div>
                                            ))}
                                            {files.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No files uploaded.</p>}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="messages" className="space-y-4">
                                        <div className="h-[400px] overflow-y-auto space-y-4 p-4 bg-slate-50 rounded-xl border border-border/50 mb-4">
                                            <div className="flex flex-col gap-4">
                                                {messages.map(m => {
                                                    const isMe = m.senderRole === "admin";
                                                    return (
                                                        <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                                            <div className={`max-w-[80%] space-y-2`}>
                                                                <div className={`p-3 rounded-xl shadow-sm border ${isMe ? "bg-primary text-primary-foreground border-primary rounded-tr-none ml-auto" : "bg-white text-secondary border-border rounded-tl-none mr-auto"}`}>
                                                                    {m.content && <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>}

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

                                                                    <span className={`text-[10px] opacity-70 mt-1 block ${isMe ? "text-right" : "text-left"}`}>
                                                                        {format(new Date(m.createdAt), "h:mm a")}
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
                                                            Client is typing...
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No messages yet.</p>}
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Input placeholder="Type a message..." value={commentContent}
                                                    onChange={e => {
                                                        setCommentContent(e.target.value);
                                                        handleTyping();
                                                    }}
                                                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && commentContent.trim()) { e.preventDefault(); sendMessageMut.mutate({ content: commentContent }); } }}
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
                                            <Button onClick={() => { if (commentContent.trim()) sendMessageMut.mutate({ content: commentContent }); }} disabled={sendMessageMut.isPending}>
                                                {sendMessageMut.isPending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-dashed border-border p-16 flex flex-col items-center justify-center text-center h-full">
                            <FolderKanban className="w-12 h-12 text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground font-medium">Select a project to view its tasks</p>
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
