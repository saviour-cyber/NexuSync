import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { IconRenderer } from "@/components/IconRenderer";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Service = { id: number; title: string; description: string; icon: string; basePrice?: number | null };

function ServiceForm({ initial, onSave, onCancel }: { initial?: Partial<Service>; onSave: (d: any) => void; onCancel: () => void }) {
    const [form, setForm] = useState({ title: initial?.title ?? "", description: initial?.description ?? "", icon: initial?.icon ?? "Settings", basePrice: initial?.basePrice ?? 0 });
    const icons = ["Palette", "Monitor", "ShoppingCart", "CreditCard", "Network", "Code", "Database", "Shield", "Wifi", "Smartphone", "Globe", "Mail"];
    return (
        <div className="bg-white rounded-2xl border border-border/50 shadow-lg p-6 mb-6">
            <h3 className="font-bold text-secondary mb-4">{initial?.id ? "Edit Service" : "New Service"}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <Label>Title</Label>
                    <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
                </div>
                <div>
                    <Label>Base Price ($)</Label>
                    <Input type="number" value={form.basePrice ?? 0} onChange={e => setForm(f => ({ ...f, basePrice: parseInt(e.target.value) || 0 }))} className="mt-1" />
                </div>
                <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" />
                </div>
                <div>
                    <Label>Icon</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                        {icons.map(ic => (
                            <button key={ic} onClick={() => setForm(f => ({ ...f, icon: ic }))}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${form.icon === ic ? "border-primary bg-primary/10" : "border-border"}`}>
                                <IconRenderer name={ic} className="w-5 h-5" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                <Button onClick={() => onSave(form)} className="gap-2"><Check className="w-4 h-4" /> Save</Button>
                <Button variant="outline" onClick={onCancel} className="gap-2"><X className="w-4 h-4" /> Cancel</Button>
            </div>
        </div>
    );
}

export default function AdminServices() {
    const qc = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Service | null>(null);

    const { data: services = [] } = useQuery<Service[]>({
        queryKey: ["/api/admin/services"],
        queryFn: () => fetch("/api/admin/services", { credentials: "include" }).then(r => r.json()),
    });

    const createMut = useMutation({
        mutationFn: (d: any) => fetch("/api/admin/services", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(d) }).then(r => r.json()),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/services"] }); qc.invalidateQueries({ queryKey: ["/api/services"] }); setShowForm(false); },
    });

    const updateMut = useMutation({
        mutationFn: ({ id, ...d }: any) => fetch(`/api/admin/services/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(d) }).then(r => r.json()),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/services"] }); qc.invalidateQueries({ queryKey: ["/api/services"] }); setEditing(null); },
    });

    const deleteMut = useMutation({
        mutationFn: (id: number) => fetch(`/api/admin/services/${id}`, { method: "DELETE", credentials: "include" }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/services"] }); qc.invalidateQueries({ queryKey: ["/api/services"] }); },
    });

    return (
        <AdminLayout>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-secondary">Services</h1>
                    <p className="text-muted-foreground mt-1">Manage the services displayed on the homepage.</p>
                </div>
                <Button onClick={() => { setShowForm(true); setEditing(null); }} className="gap-2">
                    <Plus className="w-4 h-4" /> Add Service
                </Button>
            </div>

            <AnimatePresence>
                {(showForm && !editing) && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                        <ServiceForm onSave={d => createMut.mutate(d)} onCancel={() => setShowForm(false)} />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {services.map(s => (
                    <motion.div key={s.id} layout className="bg-white rounded-2xl border border-border/50 shadow-sm p-6 group">
                        {editing?.id === s.id ? (
                            <ServiceForm initial={editing} onSave={d => updateMut.mutate({ ...d, id: s.id })} onCancel={() => setEditing(null)} />
                        ) : (
                            <>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                        <IconRenderer name={s.icon} className="w-6 h-6" />
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditing(s)} className="p-2 rounded-lg hover:bg-slate-100 text-muted-foreground hover:text-secondary transition-colors">
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => deleteMut.mutate(s.id)} className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-secondary mb-2">{s.title}</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed mb-3">{s.description}</p>
                                <p className="text-primary font-semibold text-sm">From ${(s.basePrice ?? 0).toLocaleString()}</p>
                            </>
                        )}
                    </motion.div>
                ))}
            </div>
        </AdminLayout>
    );
}
