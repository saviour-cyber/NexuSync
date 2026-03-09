import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Check, Mail, Phone, Building } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Customer = { id: number; name: string; email: string; company?: string | null; phone?: string | null; createdAt?: any };

function AddCustomerForm({ onSave, onCancel, isLoading }: any) {
    const [form, setForm] = useState({ name: "", email: "", password: "", company: "", phone: "" });
    return (
        <div className="bg-white rounded-2xl border border-border/50 shadow-lg p-6 mb-6">
            <h3 className="font-bold text-secondary mb-4">Add New Client</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {(["name", "email", "password", "company", "phone"] as const).map(field => (
                    <div key={field}>
                        <Label className="capitalize">{field}</Label>
                        <Input
                            type={field === "password" ? "password" : "text"}
                            value={form[field]}
                            onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                            className="mt-1"
                            placeholder={field === "email" ? "client@example.com" : field === "phone" ? "+1 (555) 000-0000" : ""}
                        />
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <Button onClick={() => onSave(form)} disabled={isLoading} className="gap-2"><Check className="w-4 h-4" /> Add Client</Button>
                <Button variant="outline" onClick={onCancel} className="gap-2"><X className="w-4 h-4" /> Cancel</Button>
            </div>
        </div>
    );
}

export default function AdminCustomers() {
    const qc = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState("");

    const { data: customers = [] } = useQuery<Customer[]>({
        queryKey: ["/api/admin/customers"],
        queryFn: () => fetch("/api/admin/customers", { credentials: "include" }).then(r => r.json()),
    });

    const { data: messages = [] } = useQuery<any[]>({
        queryKey: ["/api/admin/messages"],
        queryFn: () => fetch("/api/admin/messages", { credentials: "include" }).then(r => r.json()),
    });

    const createMut = useMutation({
        mutationFn: (d: any) => fetch("/api/admin/customers", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(d) }).then(r => r.json()),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/customers"] }); setShowForm(false); },
    });

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-secondary">Customers</h1>
                    <p className="text-muted-foreground mt-1">Manage client accounts and view contact inquiries.</p>
                </div>
                <Button onClick={() => setShowForm(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Client
                </Button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <AddCustomerForm onSave={createMut.mutate} onCancel={() => setShowForm(false)} isLoading={createMut.isPending} />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Client list */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border/50">
                        <Input placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} className="h-9" />
                    </div>
                    <div className="divide-y divide-border/30">
                        {filtered.length ? filtered.map(c => (
                            <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                    {c.name[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-secondary">{c.name}</p>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>
                                        {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                                        {c.company && <span className="flex items-center gap-1"><Building className="w-3 h-3" />{c.company}</span>}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-muted-foreground text-sm text-center py-12">No clients yet. Add your first client.</p>
                        )}
                    </div>
                </div>

                {/* Contact inquiries */}
                <div className="bg-white rounded-2xl border border-border/50 shadow-sm">
                    <div className="p-4 border-b border-border/50">
                        <h2 className="font-bold text-secondary">Contact Inquiries</h2>
                        <p className="text-xs text-muted-foreground">From the homepage form</p>
                    </div>
                    <div className="divide-y divide-border/30 max-h-[500px] overflow-y-auto">
                        {messages.length ? (messages as any[]).map(m => (
                            <div key={m.id} className={`p-4 ${!m.read ? "bg-blue-50/50" : ""}`}>
                                <div className="flex items-center justify-between mb-1">
                                    <p className="font-semibold text-secondary text-sm">{m.name}</p>
                                    {!m.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                                </div>
                                <p className="text-xs text-muted-foreground mb-1">{m.email}</p>
                                <p className="text-xs text-secondary/80 line-clamp-2">{m.message}</p>
                            </div>
                        )) : (
                            <p className="text-muted-foreground text-sm text-center py-8">No inquiries yet.</p>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
