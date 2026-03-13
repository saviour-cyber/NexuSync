import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ArrowRight, ArrowLeft, Calculator, Send } from "lucide-react";
import { IconRenderer } from "@/components/IconRenderer";

const timelines = ["Less than 1 month", "1–3 months", "3–6 months", "6+ months", "Flexible"];
const budgets = ["Under KSh 50,000", "KSh 50,000–KSh 150,000", "KSh 150,000–KSh 500,000", "KSh 500,000–KSh 1,500,000", "KSh 1,500,000+"];

export default function QuotePage() {
    const [step, setStep] = useState(1);
    const [selected, setSelected] = useState<number[]>([]);
    const [form, setForm] = useState({ name: "", email: "", phone: "", projectDetails: "", budget: "", timeline: "" });
    const [submitted, setSubmitted] = useState<any>(null);

    const { data: services = [] } = useQuery<any[]>({
        queryKey: ["/api/services"],
        queryFn: () => fetch("/api/services").then(r => r.json()),
    });

    const submitMut = useMutation({
        mutationFn: (d: any) => fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then(r => r.json()),
        onSuccess: data => setSubmitted(data),
    });

    const handleSubmit = () => {
        submitMut.mutate({
            ...form,
            serviceIds: JSON.stringify(selected),
        });
    };

    const estimatedTotal = services.filter(s => selected.includes(s.id)).reduce((sum: number, s: any) => sum + (s.basePrice ?? 0), 0);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Navbar />
            <main className="flex-grow pt-24 pb-16">
                <div className="max-w-2xl mx-auto px-4">

                    {submitted ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl border border-border/50 shadow-lg p-12 text-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-secondary mb-2">Quote Request Submitted!</h2>
                            <p className="text-muted-foreground mb-4">We'll review your request and get back to you within 24 hours.</p>
                            {submitted.estimatedPrice > 0 && (
                                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full font-semibold mb-6">
                                    <Calculator className="w-4 h-4" />
                                    Estimated starting from KSh {submitted.estimatedPrice.toLocaleString()}
                                </div>
                            )}
                            <div className="flex gap-3 justify-center">
                                <Button variant="outline" onClick={() => { setSubmitted(null); setStep(1); setSelected([]); setForm({ name: "", email: "", phone: "", projectDetails: "", budget: "", timeline: "" }); }}>
                                    Submit Another
                                </Button>
                                <Button asChild><a href="/">Back to Home</a></Button>
                            </div>
                        </motion.div>
                    ) : (
                        <>
                            {/* Progress */}
                            <div className="flex items-center gap-2 mb-8">
                                {[1, 2, 3].map(s => (
                                    <div key={s} className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s ? "bg-primary text-white" : "bg-white border-2 border-border text-muted-foreground"}`}>
                                            {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                                        </div>
                                        {s < 3 && <div className={`h-0.5 flex-1 min-w-[40px] transition-all ${step > s ? "bg-primary" : "bg-border"}`} />}
                                    </div>
                                ))}
                                <span className="ml-2 text-sm text-muted-foreground font-medium">
                                    {step === 1 ? "Select Services" : step === 2 ? "Project Details" : "Review & Submit"}
                                </span>
                            </div>

                            <div className="bg-white rounded-3xl border border-border/50 shadow-lg overflow-hidden">
                                <div className="p-8">
                                    <AnimatePresence mode="wait">
                                        {step === 1 && (
                                            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                                <h2 className="text-2xl font-bold text-secondary mb-2">Select Services</h2>
                                                <p className="text-muted-foreground mb-6">Choose one or more services you need.</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {services.map((s: any) => (
                                                        <button key={s.id} onClick={() => setSelected(sel => sel.includes(s.id) ? sel.filter(id => id !== s.id) : [...sel, s.id])}
                                                            className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${selected.includes(s.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${selected.includes(s.id) ? "bg-primary text-white" : "bg-slate-100 text-muted-foreground"}`}>
                                                                <IconRenderer name={s.icon} className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-secondary text-sm">{s.title}</p>
                                                                {s.basePrice > 0 && <p className="text-xs text-muted-foreground">From KSh {s.basePrice.toLocaleString()}</p>}
                                                            </div>
                                                            {selected.includes(s.id) && <CheckCircle2 className="w-4 h-4 text-primary ml-auto shrink-0" />}
                                                        </button>
                                                    ))}
                                                </div>
                                                {selected.length > 0 && (
                                                    <div className="mt-4 p-3 bg-primary/5 rounded-xl text-sm font-medium text-primary">
                                                        Estimated total: from KSh {estimatedTotal.toLocaleString()} · {selected.length} service{selected.length > 1 ? "s" : ""} selected
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}

                                        {step === 2 && (
                                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                                <h2 className="text-2xl font-bold text-secondary mb-2">Project Details</h2>
                                                <p className="text-muted-foreground mb-6">Tell us about your project so we can give you an accurate quote.</p>
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div><Label>Full Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" /></div>
                                                        <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" /></div>
                                                    </div>
                                                    <div><Label>Phone (optional)</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" /></div>
                                                    <div><Label>Project Details</Label><Textarea placeholder="Describe your project, goals, and any specific requirements..." value={form.projectDetails} onChange={e => setForm(f => ({ ...f, projectDetails: e.target.value }))} className="mt-1 min-h-[120px]" /></div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <Label>Budget Range</Label>
                                                            <div className="flex flex-col gap-2 mt-1">
                                                                {budgets.map(b => (
                                                                    <button key={b} onClick={() => setForm(f => ({ ...f, budget: b }))} className={`px-3 py-2 rounded-lg border text-sm text-left transition-all ${form.budget === b ? "border-primary bg-primary/5 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/40"}`}>{b}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Label>Timeline</Label>
                                                            <div className="flex flex-col gap-2 mt-1">
                                                                {timelines.map(t => (
                                                                    <button key={t} onClick={() => setForm(f => ({ ...f, timeline: t }))} className={`px-3 py-2 rounded-lg border text-sm text-left transition-all ${form.timeline === t ? "border-primary bg-primary/5 text-primary font-medium" : "border-border text-muted-foreground hover:border-primary/40"}`}>{t}</button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {step === 3 && (
                                            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                                                <h2 className="text-2xl font-bold text-secondary mb-2">Review & Submit</h2>
                                                <p className="text-muted-foreground mb-6">Make sure everything looks correct before submitting.</p>
                                                <div className="space-y-4">
                                                    <div className="bg-slate-50 rounded-xl p-4">
                                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Selected Services</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {services.filter((s: any) => selected.includes(s.id)).map((s: any) => (
                                                                <span key={s.id} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">{s.title}</span>
                                                            ))}
                                                        </div>
                                                        {estimatedTotal > 0 && <p className="text-sm font-semibold text-primary mt-2">Starting estimate: KSh {estimatedTotal.toLocaleString()}</p>}
                                                    </div>
                                                    <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Your Details</p>
                                                        <p><span className="font-medium">Name:</span> {form.name}</p>
                                                        <p><span className="font-medium">Email:</span> {form.email}</p>
                                                        {form.phone && <p><span className="font-medium">Phone:</span> {form.phone}</p>}
                                                        {form.budget && <p><span className="font-medium">Budget:</span> {form.budget}</p>}
                                                        {form.timeline && <p><span className="font-medium">Timeline:</span> {form.timeline}</p>}
                                                        <p><span className="font-medium">Details:</span> {form.projectDetails}</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="px-8 pb-8 flex justify-between">
                                    <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1} className="gap-2">
                                        <ArrowLeft className="w-4 h-4" /> Back
                                    </Button>
                                    {step < 3 ? (
                                        <Button onClick={() => setStep(s => s + 1)} disabled={step === 1 && selected.length === 0} className="gap-2">
                                            Continue <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    ) : (
                                        <Button onClick={handleSubmit} disabled={submitMut.isPending || !form.name || !form.email || !form.projectDetails} className="gap-2">
                                            {submitMut.isPending ? "Submitting..." : <><Send className="w-4 h-4" /> Submit Quote</>}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
            <Footer />
        </div>
    );
}
