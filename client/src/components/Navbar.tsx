import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Cpu } from "lucide-react";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setIsMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? "glass shadow-sm py-3" : "bg-transparent py-5"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform">
            <Cpu className="w-6 h-6" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">
            Nexa<span className="text-primary">Sync</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-muted-foreground">
          <button onClick={() => scrollToSection("services")} className="hover:text-primary transition-colors">
            Services
          </button>
          <button onClick={() => scrollToSection("about")} className="hover:text-primary transition-colors">
            About Us
          </button>
          <Link href="/login">
            <a className="hover:text-primary transition-colors font-semibold">Client Login</a>
          </Link>
          <Button onClick={() => scrollToSection("contact")} className="font-semibold shadow-md shadow-primary/20 hover:shadow-lg transition-all rounded-full px-6">
            Get in Touch
          </Button>
        </nav>

        {/* Mobile Nav Toggle */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-background border-b border-border shadow-xl px-4 py-6 flex flex-col gap-4">
          <button onClick={() => scrollToSection("services")} className="text-left font-medium text-lg p-2">
            Services
          </button>
          <button onClick={() => scrollToSection("about")} className="text-left font-medium text-lg p-2">
            About Us
          </button>
          <Link href="/login">
            <a className="text-left font-medium text-lg p-2 text-primary">Client Login</a>
          </Link>
          <Button onClick={() => scrollToSection("contact")} className="w-full mt-2 rounded-xl">
            Get in Touch
          </Button>
        </div>
      )}
    </header>
  );
}
