import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Cpu, Lock, Mail, AlertCircle, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLogin() {
    const { login } = useAuth();
    const [, navigate] = useLocation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            await login(email, password);
            const res = await fetch("/api/auth/me", { credentials: "include" });
            const user = await res.json();
            navigate(user.role === "admin" ? "/admin" : "/portal");
        } catch (err: any) {
            setError(err.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 border border-slate-700 mb-4 shadow-xl">
                        <ShieldAlert className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">System Access</h1>
                    <p className="text-slate-400 mt-1">Admin Portal Authentication</p>
                </div>

                {/* Card */}
                <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 p-8">
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 bg-red-950/50 border border-red-900/50 rounded-xl p-3 mb-6 text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-slate-300">Admin Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@wchch.dev"
                                    className="pl-10 h-12 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-primary"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-slate-300">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10 h-12 bg-slate-900 border-slate-700 text-white placeholder:text-slate-600 focus-visible:ring-primary"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20"
                            disabled={isLoading}
                        >
                            {isLoading ? "Authenticating..." : "Authorize"}
                        </Button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-700 text-center">
                        <a href="/" className="text-sm text-slate-500 hover:text-primary transition-colors">
                            ← Return to public site
                        </a>
                    </div>
                </div>

                <p className="text-center text-xs text-slate-600 mt-6 font-mono">
                    NexaSync Secure Gateway
                </p>
            </motion.div>
        </div>
    );
}
