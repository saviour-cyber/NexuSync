import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, ChevronRight, MessageSquare } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@shared/routes";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { IconRenderer } from "@/components/IconRenderer";
import { useServices } from "@/hooks/use-services";
import { useSubmitContact } from "@/hooks/use-contact";
import { openWhatsApp } from "@/utils/openWhatsApp";
import { LeadCaptureDialog } from "@/components/LeadCaptureDialog";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function Home() {
  const { data: services, isLoading: isServicesLoading } = useServices();
  const contactMutation = useSubmitContact();
  const [leadDialogService, setLeadDialogService] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(api.contactMessages.create.input),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      message: "",
    },
  });

  const onSubmit = (data: any) => {
    contactMutation.mutate(data, {
      onSuccess: () => form.reset(),
    });
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar />

      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden hero-gradient">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl">
              <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
                <motion.p
                  variants={fadeInUp}
                  className="text-sm sm:text-base font-semibold tracking-[0.2em] uppercase text-primary/80 mb-4 font-display"
                >
                  Your Partner in Digital Success
                </motion.p>
                <motion.h1 variants={fadeInUp} className="text-5xl sm:text-6xl lg:text-7xl font-display font-extrabold text-secondary leading-[1.1] mb-5 tracking-tight text-balance">
                  Elevate Your Business with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Modern Technology</span>
                </motion.h1>

                <motion.p variants={fadeInUp} className="text-lg sm:text-xl text-muted-foreground mb-8 text-balance leading-relaxed max-w-2xl">
                  From stunning graphics and e-commerce platforms to robust POS systems and secure networking. We deliver end-to-end IT services that drive growth.
                </motion.p>

                <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-4">
                  <Button size="lg" className="rounded-full px-8 h-14 text-base shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5" onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>
                    Explore Services <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-base bg-white/50 backdrop-blur-sm border-border/50 hover:bg-white" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}>
                    Contact Us
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </div>

          {/* Decorative background elements */}
          {/* landing page hero abstract background texture */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-[0.03] pointer-events-none mix-blend-multiply dark:mix-blend-screen dark:opacity-10">
            <img
              src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&h=1600&fit=crop"
              alt=""
              className="w-full h-full object-cover rounded-full blur-3xl"
            />
          </div>
        </section>

        {/* SERVICES SECTION */}
        <section id="services" className="py-24 bg-white relative z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeInUp}
              className="text-center max-w-2xl mx-auto mb-16"
            >
              <h2 className="text-sm font-bold text-primary tracking-wider uppercase mb-2">Our Expertise</h2>
              <h3 className="text-3xl md:text-4xl font-display font-bold text-secondary mb-4">Comprehensive IT Services</h3>
              <p className="text-muted-foreground text-lg">We provide everything you need to establish, grow, and secure your digital presence.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {isServicesLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl p-8 border border-border/50 shadow-sm">
                    <Skeleton className="w-14 h-14 rounded-xl mb-6" />
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6" />
                  </div>
                ))
              ) : services?.map((service, idx) => (
                <motion.div
                  key={service.id}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { delay: idx * 0.1, duration: 0.5 } }
                  }}
                  className="group flex flex-col h-full rounded-3xl p-8 bg-background border border-border/60 shadow-lg shadow-black/[0.02] hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300 shrink-0 relative z-10">
                    <IconRenderer name={service.icon} className="w-7 h-7" />
                  </div>

                  <h4 className="text-xl font-display font-bold text-secondary mb-3 relative z-10">{service.title}</h4>
                  <p className="text-muted-foreground leading-relaxed mb-6 flex-grow relative z-10">{service.description}</p>

                  <div className="mt-auto pt-4 border-t border-border/40 relative z-10">
                    <button
                      onClick={() => setLeadDialogService(service.title)}
                      className="flex items-center justify-center w-full gap-2 bg-[#25D366] hover:bg-[#128c7e] text-white px-4 py-2.5 rounded-xl transition-all shadow-md shadow-[#25D366]/20 font-semibold text-sm hover:-translate-y-0.5"
                    >
                      Inquire on WhatsApp
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* WHY CHOOSE US SECTION */}
        <section id="about" className="py-24 bg-slate-50 border-y border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-sm font-bold text-primary tracking-wider uppercase mb-2">Why NexaSync</h2>
                <h3 className="text-3xl md:text-4xl font-display font-bold text-secondary mb-6 text-balance">
                  Dedicated to engineering your success
                </h3>
                <p className="text-lg text-muted-foreground mb-8 text-balance">
                  We don't just build websites or set up networks; we craft holistic technology ecosystems designed to streamline your operations and maximize your revenue.
                </p>

                <div className="space-y-4">
                  {[
                    "Tailored solutions for your specific industry",
                    "Expert team with years of cross-domain experience",
                    "Ongoing support and dedicated maintenance",
                    "Focus on security, scalability, and performance"
                  ].map((point, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                      <span className="text-secondary font-medium">{point}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-3xl transform rotate-3 scale-105"></div>
                {/* landing page tech workspace team */}
                <img
                  src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&h=800&fit=crop"
                  alt="Team collaborating on technology solutions"
                  className="relative rounded-3xl shadow-2xl z-10 w-full h-auto object-cover border border-white/20"
                />
              </motion.div>
            </div>
          </div>
        </section>

        {/* CONTACT SECTION */}
        <section id="contact" className="py-24 bg-white relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-indigo-900 rounded-[2.5rem] overflow-hidden shadow-2xl relative">

              {/* Background Accents */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px] pointer-events-none"></div>

              <div className="grid grid-cols-1 lg:grid-cols-2 relative z-10">
                {/* Contact Info */}
                <div className="p-12 lg:p-16 text-white flex flex-col justify-center">
                  <h3 className="text-3xl md:text-5xl font-display font-bold mb-6">Let's build something amazing together.</h3>
                  <p className="text-white/70 text-lg mb-8 max-w-md">
                    Ready to transform your IT infrastructure? Fill out the form, and our experts will get back to you within 24 hours.
                  </p>

                  <div className="mt-auto pt-8 border-t border-white/10">
                    <p className="font-medium text-white/90">Email us directly:</p>
                    <a href="mailto:ndohadaviz@gmail.com" className="text-xl font-bold text-primary hover:text-white transition-colors">
                      ndohadaviz@gmail.com
                    </a>
                  </div>
                </div>

                {/* Contact Form */}
                <div className="bg-white m-4 lg:m-6 rounded-3xl p-8 lg:p-12 shadow-inner">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <h4 className="text-2xl font-display font-bold text-secondary mb-6">Send a Message</h4>

                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-secondary font-semibold">Full Name</FormLabel>
                            <FormControl>
                              <Input className="h-12 bg-slate-50 border-border/60 focus-visible:ring-primary/20" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-secondary font-semibold">Email Address</FormLabel>
                              <FormControl>
                                <Input type="email" className="h-12 bg-slate-50 border-border/60 focus-visible:ring-primary/20" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-secondary font-semibold">Phone (Optional)</FormLabel>
                              <FormControl>
                                <Input className="h-12 bg-slate-50 border-border/60 focus-visible:ring-primary/20" {...field} value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-secondary font-semibold">How can we help?</FormLabel>
                            <FormControl>
                              <Textarea
                                className="resize-none min-h-[120px] bg-slate-50 border-border/60 focus-visible:ring-primary/20"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-14 text-lg font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                        disabled={contactMutation.isPending}
                      >
                        {contactMutation.isPending ? "Sending..." : "Send Message"}
                      </Button>
                    </form>
                  </Form>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <LeadCaptureDialog
        isOpen={!!leadDialogService}
        onClose={() => setLeadDialogService(null)}
        serviceTitle={leadDialogService || undefined}
      />

      <Footer />
    </div>
  );
}
