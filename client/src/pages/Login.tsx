import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cpu, Lock, Mail, AlertCircle, Building2, User, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function Login() {
    const { login, register } = useAuth();
    const [, navigate] = useLocation();

    // Auth Mode
    const [isLoginBlock, setIsLoginBlock] = useState(true);

    // Login Fields
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Register Fields
    const [clientName, setClientName] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [phone, setPhone] = useState("");
    const [servicesInterested, setServicesInterested] = useState("");

    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
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

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            await register({
                clientName,
                companyName,
                email,
                phone,
                password,
                servicesInterested
            });
            // Automatically redirects to portal upon successful registration and auto-login
            navigate("/portal");
        } catch (err: any) {
            setError(err.message || "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
                            <Cpu className="w-7 h-7 text-white" />
                        </div>
                        <span className="font-bold text-2xl tracking-tight">
                            Nexa<span className="text-primary">Sync</span>
                        </span>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-2xl shadow-black/[0.05] border border-border/50 p-8">
                    <Tabs defaultValue="login" className="w-full" onValueChange={(val) => setIsLoginBlock(val === 'login')}>
                        <TabsList className="grid w-full grid-cols-2 mb-8 h-12 rounded-xl bg-slate-100 p-1">
                            <TabsTrigger value="login" className="rounded-lg font-medium text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Sign In</TabsTrigger>
                            <TabsTrigger value="register" className="rounded-lg font-medium text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">Create Account</TabsTrigger>
                        </TabsList>

                        <div className="text-center mb-8">
                            <p className="text-secondary font-medium text-lg">
                                {isLoginBlock ? "Sign in to your account" : "Join NexaSync Platform"}
                            </p>
                            <p className="text-muted-foreground text-sm mt-1">
                                {isLoginBlock ? "Access your projects, files, and billing." : "Get instant access to your customized portal."}
                            </p>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-3 mb-6 text-sm">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <TabsContent value="login">
                            <form onSubmit={handleLogin} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="login-email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="login-email"
                                            type="email"
                                            placeholder="client@example.com"
                                            className="pl-10 h-12"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="login-password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="login-password"
                                            type="password"
                                            placeholder="••••••••"
                                            className="pl-10 h-12"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/20"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Signing in..." : "Sign In"}
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="register">
                            <form onSubmit={handleRegister} className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-name">Your Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="reg-name"
                                                placeholder="John Doe"
                                                className="pl-10 h-11"
                                                value={clientName}
                                                onChange={e => setClientName(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-company">Company</Label>
                                        <div className="relative">
                                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                id="reg-company"
                                                placeholder="Acme Corp"
                                                className="pl-10 h-11"
                                                value={companyName}
                                                onChange={e => setCompanyName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reg-email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="reg-email"
                                            type="email"
                                            placeholder="client@example.com"
                                            className="pl-10 h-11"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reg-password">Password</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="reg-password"
                                            type="password"
                                            placeholder="••••••••"
                                            className="pl-10 h-11"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="reg-services">Interested Services</Label>
                                    <div className="relative">
                                        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            id="reg-services"
                                            placeholder="e.g. Web Development, SEO"
                                            className="pl-10 h-11"
                                            value={servicesInterested}
                                            onChange={e => setServicesInterested(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground text-right">This automatically generates an initial quote for you.</p>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Creating Portal..." : "Create Account & Portal"}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>

                    <div className="mt-8 pt-6 border-t border-border/50 text-center">
                        <a href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            ← Back to website
                        </a>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
