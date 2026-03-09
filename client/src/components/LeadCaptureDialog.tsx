import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { openWhatsApp } from "@/utils/openWhatsApp";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageSquare } from "lucide-react";

type LeadCaptureDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    serviceTitle?: string;
};

export function LeadCaptureDialog({ isOpen, onClose, serviceTitle }: LeadCaptureDialogProps) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const { toast } = useToast();

    const leadMutation = useMutation({
        mutationFn: async (data: { name: string; phone: string; service: string | null; message: string | null }) => {
            const res = await fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save lead");
            return res.json();
        },
        onSuccess: () => {
            // Open WhatsApp
            openWhatsApp(serviceTitle || "General Inquiry");

            toast({
                title: "Connecting to WhatsApp...",
                description: "Opening chat securely.",
            });

            // Wait slightly before closing to allow popup
            setTimeout(() => {
                onClose();
                setName("");
                setPhone("");
            }, 500);
        },
        onError: () => {
            toast({
                title: "Error",
                description: "Something went wrong, but we are still redirecting you.",
                variant: "destructive"
            });
            openWhatsApp(serviceTitle || "General Inquiry");
            onClose();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !phone.trim()) return;

        leadMutation.mutate({
            name,
            phone,
            service: serviceTitle || null,
            message: `User clicked WhatsApp button for: ${serviceTitle || "General Inquiry"}`
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Connect on WhatsApp</DialogTitle>
                    <DialogDescription>
                        Please provide your details so we can assist you better with {serviceTitle ? `your ${serviceTitle} inquiry` : "your inquiry"}.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="lead-name">Name</Label>
                        <Input
                            id="lead-name"
                            placeholder="John Doe"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lead-phone">Phone Number</Label>
                        <Input
                            id="lead-phone"
                            placeholder="+254 700 000 000"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-[#25D366] hover:bg-[#128c7e] text-white flex gap-2"
                        disabled={leadMutation.isPending || !name.trim() || !phone.trim()}
                    >
                        {leadMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <MessageSquare className="w-4 h-4" />
                        )}
                        Continue to Chat
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
