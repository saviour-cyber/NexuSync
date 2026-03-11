import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Save, CreditCard, Building2, ShieldCheck, Settings } from "lucide-react";

export default function PaymentSettings() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState({
        mpesa_shortcode: "",
        mpesa_passkey: "",
        mpesa_consumer_key: "",
        mpesa_consumer_secret: "",
        bank_details: ""
    });

    const { data: settings, isLoading } = useQuery({
        queryKey: ["/api/admin/settings/payment"]
    });

    useEffect(() => {
        if (settings) {
            setFormData({
                mpesa_shortcode: settings.mpesa_shortcode || "",
                mpesa_passkey: settings.mpesa_passkey || "",
                mpesa_consumer_key: settings.mpesa_consumer_key || "",
                mpesa_consumer_secret: settings.mpesa_consumer_secret || "",
                bank_details: settings.bank_details || ""
            });
        }
    }, [settings]);

    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            await apiRequest("POST", "/api/admin/settings/payment", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/payment"] });
            toast({
                title: "Settings Saved",
                description: "Payment gateway configuration has been updated."
            });
        },
        onError: () => {
            toast({
                title: "Failed to save settings",
                description: "There was an error updating the configuration.",
                variant: "destructive"
            });
        }
    });

    if (isLoading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="max-w-4xl mx-auto py-6">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <Settings className="w-8 h-8 text-primary" />
                        Payment Gateways
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Configure M-Pesa API keys and Bank Transfer details for your clients.
                    </p>
                </div>

                <div className="space-y-8">
                    {/* M-Pesa Settings Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="border-b border-slate-100 bg-slate-50/50 p-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#18C972]/10 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-[#18C972]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-slate-800">M-Pesa Daraja Integration</h2>
                                <p className="text-sm text-slate-500">API credentials for dynamic STK Push requests.</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-medium">Business Shortcode</Label>
                                    <Input 
                                        value={formData.mpesa_shortcode}
                                        onChange={e => setFormData(p => ({ ...p, mpesa_shortcode: e.target.value }))}
                                        placeholder="e.g. 174379"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-medium">Lipa Na M-Pesa Passkey</Label>
                                    <Input 
                                        type="password"
                                        value={formData.mpesa_passkey}
                                        onChange={e => setFormData(p => ({ ...p, mpesa_passkey: e.target.value }))}
                                        placeholder="Enter passkey"
                                        className="h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-medium font-mono text-xs">Consumer Key</Label>
                                    <Input 
                                        type="password"
                                        value={formData.mpesa_consumer_key}
                                        onChange={e => setFormData(p => ({ ...p, mpesa_consumer_key: e.target.value }))}
                                        placeholder="Consumer Key"
                                        className="h-11 font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 font-medium font-mono text-xs">Consumer Secret</Label>
                                    <Input 
                                        type="password"
                                        value={formData.mpesa_consumer_secret}
                                        onChange={e => setFormData(p => ({ ...p, mpesa_consumer_secret: e.target.value }))}
                                        placeholder="Consumer Secret"
                                        className="h-11 font-mono text-sm"
                                    />
                                </div>
                            </div>
                            
                            <div className="bg-amber-50 text-amber-800 p-4 rounded-xl flex items-start gap-3 border border-amber-200/50">
                                <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                                <div className="text-sm leading-relaxed">
                                    <strong>Note:</strong> If these fields are left blank, the system will attempt to use the `.env` fallback. If neither are available, it will use a mock simulation for testing purposes.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bank Transfer Settings Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="border-b border-slate-100 bg-slate-50/50 p-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-slate-800">Bank Transfer Details</h2>
                                <p className="text-sm text-slate-500">This is exactly what the client will see when they choose "Bank Transfer".</p>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="space-y-3">
                                <Label className="text-slate-700 font-medium">Account Information Display Text</Label>
                                <Textarea 
                                    className="min-h-[160px] font-mono text-sm leading-relaxed p-4"
                                    value={formData.bank_details}
                                    placeholder={`Bank Name: Equity Bank\nAccount Name: NexaSync Ltd\nAccount Number: 123456789012\nBranch: Nairobi`}
                                    onChange={e => setFormData(p => ({ ...p, bank_details: e.target.value }))}
                                />
                                <p className="text-xs text-muted-foreground flex justify-end">Format however you want. Line breaks will be preserved.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 pb-12">
                        <Button 
                            className="h-12 px-8 text-base shadow-lg shadow-primary/20"
                            onClick={() => mutation.mutate(formData)}
                            disabled={mutation.isPending}
                        >
                            {mutation.isPending ? "Saving configuration..." : (
                                <>
                                    <Save className="w-5 h-5 mr-2" /> Save Gateway Settings
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
