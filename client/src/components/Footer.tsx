import { Cpu, Mail, MapPin, Phone } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground py-16 border-t border-border/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-8">
          
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                <Cpu className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-xl tracking-tight text-white">
                Nexa<span className="text-primary/80">Sync</span>
              </span>
            </div>
            <p className="text-muted-foreground max-w-md text-balance leading-relaxed">
              Empowering businesses through cutting-edge IT solutions, from stunning web designs to robust networking infrastructure. Your technology partner for the digital age.
            </p>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-6 text-lg">Services</h4>
            <ul className="space-y-3 text-muted-foreground font-medium">
              <li className="hover:text-primary transition-colors cursor-pointer">Graphic Design</li>
              <li className="hover:text-primary transition-colors cursor-pointer">Web Development</li>
              <li className="hover:text-primary transition-colors cursor-pointer">E-commerce Solutions</li>
              <li className="hover:text-primary transition-colors cursor-pointer">POS Systems</li>
              <li className="hover:text-primary transition-colors cursor-pointer">Networking setup</li>
            </ul>
          </div>

          <div>
            <h4 className="font-display font-semibold text-white mb-6 text-lg">Contact</h4>
            <ul className="space-y-4 text-muted-foreground font-medium">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Nyeri,<br />Kenya</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span>+254 740 879 234</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span>ndohadaviz@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} NexaSync IT Solutions. All rights reserved.</p>
          <div className="flex gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
