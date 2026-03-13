import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage, hashPassword, verifyPassword } from "./storage";
import { insertContactMessageSchema, insertServiceSchema, insertQuoteSchema, insertProjectSchema, insertTaskSchema, insertMilestoneSchema, insertProjectCommentSchema, insertInvoiceSchema, insertProjectFileSchema, insertUpdateRequestSchema, insertWhatsappLeadSchema, signUpSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import multer from "multer";
import path from "path";
import fs from "fs";
import { Server as SocketIOServer } from "socket.io";
import crypto from "crypto";

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

// ─── Types ─────────────────────────────────────────────────────────────────
declare module "express-session" {
  interface SessionData {
    userId?: number;
    userRole?: string;
  }
}

// ─── Middleware ────────────────────────────────────────────────────────────
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId || req.session?.userRole !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

// ─── Routes ────────────────────────────────────────────────────────────────
export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io"
  });

  // Run migration
  storage.migrateCommentsToMessages().catch(err => console.error("Migration failed:", err));

  io.on("connection", (socket) => {
    socket.on("joinProject", (projectId: number) => {
      socket.join(`project_${projectId}`);
      // console.log(`Socket ${socket.id} joined project_${projectId}`);
    });

    socket.on("sendMessage", async (data: any) => {
      const { projectId, content, senderRole, senderId } = data;
      const conv = await storage.getConversationByProjectId(projectId);
      const msg = await storage.createMessage({
        conversationId: conv.id,
        content,
        senderRole,
        senderId
      });
      io.to(`project_${projectId}`).emit("receiveMessage", { ...msg, attachments: [] });
    });

    socket.on("typing", (data: { projectId: number, senderRole: string }) => {
      socket.to(`project_${data.projectId}`).emit("userTyping", data);
    });

    socket.on("stopTyping", (data: { projectId: number, senderRole: string }) => {
      socket.to(`project_${data.projectId}`).emit("userStopTyping", data);
    });
  });

  // ── PUBLIC: Services ─────────────────────────────────────────────────────
  app.get("/api/services", async (_req, res) => {
    const data = await storage.getServices();
    res.json(data);
  });

  // ── PUBLIC: Contact Form ──────────────────────────────────────────────────
  app.post("/api/contact", async (req, res) => {
    try {
      const input = insertContactMessageSchema.parse(req.body);
      const msg = await storage.createContactMessage(input);
      res.status(201).json(msg);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join(".") });
      }
      throw err;
    }
  });

  // ── PUBLIC: Quote Request ─────────────────────────────────────────────────
  app.post("/api/quotes", async (req, res) => {
    try {
      const input = insertQuoteSchema.parse(req.body);
      const allServices = await storage.getServices();
      const serviceIds: number[] = JSON.parse(input.serviceIds);
      const selectedServices = allServices.filter(s => serviceIds.includes(s.id));
      const estimatedPrice = selectedServices.reduce((sum, s) => sum + (s.basePrice ?? 0), 0);
      const quote = await storage.createQuote(input);
      await storage.updateQuote(quote.id, { estimatedPrice });
      res.status(201).json({ ...quote, estimatedPrice });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // ── AUTH ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
    const user = await storage.getUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    req.session.userId = user.id;
    req.session.userRole = user.role;
    const { passwordHash, ...pub } = user;
    res.json(pub);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ ok: true });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    const user = await storage.getUserById(req.session.userId!);
    if (!user) return res.status(401).json({ message: "Session invalid" });
    const { passwordHash, ...pub } = user;
    res.json(pub);
  });

  // ── ONBOARDING: Client Registration ───────────────────────────────────────
  app.post("/api/register", async (req, res) => {
    try {
      const data = signUpSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // 1. Create User
      const user = await storage.createUser({
        name: data.clientName,
        email: data.email,
        passwordHash: hashPassword(data.password),
        role: "client",
        company: data.companyName,
        phone: data.phone
      });

      // 2. Create Default "Onboarding & Setup" Project
      const project = await storage.createProject({
        title: "Onboarding & Setup",
        description: "Initial workspace for tracking your requirements and quotes.",
        clientId: user.id,
        status: "active",
        progress: 10
      });

      // 3. Create Automated Quote based on interest
      if (data.servicesInterested) {
        await storage.createQuote({
          name: data.clientName,
          email: data.email,
          phone: data.phone,
          serviceIds: JSON.stringify([]), // Will adjust once services structure is solid
          projectDetails: `Automated Request: Interested in ${data.servicesInterested}`,
          budget: "TBD",
          timeline: "Flexible"
        });
      }

      // 4. Create Welcome Message on the Project
      await storage.createComment({
        projectId: project.id,
        userId: 1, // System Admin ID usually 1
        content: `Welcome to NexaSync, ${data.clientName}! This is your portal where you can track our progress, view files, and communicate directly with us. Let us know how we can help you get started.`
      });

      // Auto-login the user
      req.session.userId = user.id;
      req.session.userRole = "client";

      res.status(201).json(user);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Registration error:", err);
      res.status(500).json({ message: "Internal server error during registration" });
    }
  });

  // ── ADMIN: Services ───────────────────────────────────────────────────────
  app.get("/api/admin/services", requireAdmin, async (_req, res) => {
    res.json(await storage.getServices());
  });

  app.post("/api/admin/services", requireAdmin, async (req, res) => {
    try {
      const input = insertServiceSchema.parse(req.body);
      res.status(201).json(await storage.createService(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put("/api/admin/services/:id", requireAdmin, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const updated = await storage.updateService(id, req.body);
    if (!updated) return res.status(404).json({ message: "Service not found" });
    res.json(updated);
  });

  app.delete("/api/admin/services/:id", requireAdmin, async (req, res) => {
    await storage.deleteService(parseInt(req.params.id as string));
    res.json({ ok: true });
  });

  // ── ADMIN: Customers ──────────────────────────────────────────────────────
  app.get("/api/admin/customers", requireAdmin, async (_req, res) => {
    res.json(await storage.getClients());
  });

  app.post("/api/admin/customers", requireAdmin, async (req, res) => {
    try {
      const { name, email, password, company, phone } = req.body;
      if (!name || !email || !password) return res.status(400).json({ message: "name, email, password are required" });
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(409).json({ message: "Email already exists" });
      const user = await storage.createUser({ name, email, passwordHash: hashPassword(password), role: "client", company, phone });
      res.status(201).json(user);
    } catch (err) { throw err; }
  });

  // ── ADMIN: Projects ───────────────────────────────────────────────────────
  app.get("/api/admin/projects", requireAuth, requireAdmin, async (req, res) => {
    const projs = await storage.getProjects();
    const enriched = await Promise.all(projs.map(async p => {
      const conv = await storage.getConversationByProjectId(p.id);
      const messages = await storage.getMessagesByConversationId(conv.id);
      const unreadCount = messages.filter(m => (m.createdAt || new Date(0)) > (conv.adminLastReadAt || new Date(0))).length;
      return { ...p, unreadCount };
    }));
    res.json(enriched);
  });

  app.post("/api/admin/projects", requireAdmin, async (req, res) => {
    try {
      const input = insertProjectSchema.parse(req.body);
      res.status(201).json(await storage.createProject(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put("/api/admin/projects/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateProject(parseInt(req.params.id as string), req.body);
    if (!updated) return res.status(404).json({ message: "Project not found" });
    res.json(updated);
  });

  app.delete("/api/admin/projects/:id", requireAdmin, async (req, res) => {
    await storage.deleteProject(parseInt(req.params.id as string));
    res.json({ ok: true });
  });

  app.post("/api/admin/projects/:id/invoice", requireAdmin, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id as string);
      const project = await storage.getProjectById(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!project.clientId) return res.status(400).json({ message: "Project has no client assigned" });

      const amount = project.budget || 0; // Create invoice with budget amount

      const invoice = await storage.createInvoice({
        projectId: project.id,
        clientId: project.clientId,
        amount,
        status: "unpaid",
        dueDate: null
      });

      res.status(201).json(invoice);
    } catch (err) {
      console.error("Invoice generation error:", err);
      res.status(500).json({ message: "Failed to generate invoice" });
    }
  });

  // ── ADMIN: Tasks ─────────────────────────────────────────────────────────
  app.get("/api/admin/tasks", requireAdmin, async (req, res) => {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    res.json(await storage.getTasks(projectId));
  });

  app.post("/api/admin/tasks", requireAdmin, async (req, res) => {
    try {
      const input = insertTaskSchema.parse(req.body);
      res.status(201).json(await storage.createTask(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put("/api/admin/tasks/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateTask(parseInt(req.params.id as string), req.body);
    if (!updated) return res.status(404).json({ message: "Task not found" });
    res.json(updated);
  });

  // ── ADMIN: Milestones ─────────────────────────────────────────────────────
  app.get("/api/admin/milestones", requireAdmin, async (req, res) => {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    res.json(await storage.getMilestones(projectId));
  });

  app.post("/api/admin/milestones", requireAdmin, async (req, res) => {
    try {
      const input = insertMilestoneSchema.parse(req.body);
      res.status(201).json(await storage.createMilestone(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put("/api/admin/milestones/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateMilestone(parseInt(req.params.id as string), req.body);
    if (!updated) return res.status(404).json({ message: "Milestone not found" });
    res.json(updated);
  });

  // ── ADMIN: Quotes ─────────────────────────────────────────────────────────
  app.get("/api/admin/quotes", requireAdmin, async (_req, res) => {
    res.json(await storage.getQuotes());
  });

  app.post("/api/admin/quotes/:id/convert", requireAdmin, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id as string);
      const quote = await storage.getQuoteById(quoteId);

      if (!quote) return res.status(404).json({ message: "Quote not found" });
      if (quote.status === "approved") return res.status(400).json({ message: "Quote already converted" });

      // 1. Find or create the client user
      let user: any = await storage.getUserByEmail(quote.email);
      if (!user) {
        user = await storage.createUser({
          name: quote.name,
          email: quote.email,
          passwordHash: hashPassword(Math.random().toString(36).slice(-10)), // Generate a random password temp
          role: "client",
          phone: quote.phone
        });
      }

      // 2. Parse service IDs if any
      let firstServiceId = null;
      try {
        const sIds = JSON.parse(quote.serviceIds);
        if (Array.isArray(sIds) && sIds.length > 0) {
          firstServiceId = sIds[0];
        }
      } catch (e) { }

      // 3. Create the Project
      const project = await storage.createProject({
        title: `Project: ${quote.projectDetails.substring(0, 30)}...`,
        description: quote.projectDetails,
        clientId: user.id,
        serviceId: firstServiceId,
        status: "active",
        budget: quote.estimatedPrice,
        progress: 0
      });

      // 4. Create an initial welcome comment in the messaging system
      const conv = await storage.getConversationByProjectId(project.id);
      await storage.createMessage({
        conversationId: conv.id,
        senderRole: "admin",
        senderId: req.session.userId!,
        content: `Project automatically generated from Approved Quote (#${quote.id}).`
      });

      // 5. Update quote status
      await storage.updateQuote(quote.id, { status: "approved" });

      res.status(201).json(project);
    } catch (err) {
      console.error("Quote conversion error:", err);
      res.status(500).json({ message: "Failed to convert quote to project" });
    }
  });

  app.put("/api/admin/quotes/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateQuote(parseInt(req.params.id as string), req.body);
    if (!updated) return res.status(404).json({ message: "Quote not found" });
    res.json(updated);
  });

  // ── ADMIN: Messages ───────────────────────────────────────────────────────
  app.get("/api/admin/messages", requireAdmin, async (_req, res) => {
    res.json(await storage.getContactMessages());
  });

  app.put("/api/admin/messages/:id/read", requireAdmin, async (req, res) => {
    await storage.markMessageRead(parseInt(req.params.id as string));
    res.json({ ok: true });
  });

  // ── ADMIN: Analytics ──────────────────────────────────────────────────────
  app.get("/api/admin/analytics", requireAdmin, async (_req, res) => {
    res.json(await storage.getAnalytics());
  });

  // ── ADMIN: WhatsApp Leads ──────────────────────────────────────────────────
  app.get("/api/admin/leads", requireAdmin, async (_req, res) => {
    res.json(await storage.getWhatsappLeads());
  });

  app.post("/api/admin/leads/:id/convert", requireAdmin, async (req, res) => {
    try {
      const leadId = parseInt(req.params.id as string);
      const lead = await storage.getWhatsappLeadById(leadId);

      if (!lead) return res.status(404).json({ message: "Lead not found" });
      if (lead.status === "closed" || lead.status === "converted") return res.status(400).json({ message: "Lead already closed or converted" });

      // Create a Quote
      const quote = await storage.createQuote({
        name: lead.name,
        email: "whatsapp-client@example.com", // Placeholder
        phone: lead.phone,
        serviceIds: JSON.stringify([]),
        projectDetails: `Inbound WhatsApp Lead: ${lead.service || 'General Inquiry'}\nMessage: ${lead.message || 'None'}`,
        budget: "TBD",
        timeline: "TBD"
      });

      // Update lead status
      await storage.updateWhatsappLeadStatus(lead.id, "converted");

      res.status(201).json(quote);
    } catch (err) {
      console.error("Lead conversion error:", err);
      res.status(500).json({ message: "Failed to convert lead to quote" });
    }
  });

  app.patch("/api/admin/leads/:id", requireAdmin, async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "Status is required" });
    const updated = await storage.updateWhatsappLeadStatus(parseInt(req.params.id as string), status);
    if (!updated) return res.status(404).json({ message: "Lead not found" });
    res.json(updated);
  });

  // ── PUBLIC: WhatsApp Leads ────────────────────────────────────────────────
  app.post("/api/leads", async (req, res) => {
    try {
      const input = insertWhatsappLeadSchema.parse(req.body);
      const lead = await storage.createWhatsappLead(input);
      res.status(201).json(lead);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // ── ADMIN: Invoices ───────────────────────────────────────────────────────
  app.get("/api/admin/invoices", requireAdmin, async (_req, res) => {
    res.json(await storage.getInvoices());
  });

  app.post("/api/admin/invoices", requireAdmin, async (req, res) => {
    try {
      const input = insertInvoiceSchema.parse(req.body);
      res.status(201).json(await storage.createInvoice(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put("/api/admin/invoices/:id", requireAdmin, async (req, res) => {
    const updated = await storage.updateInvoice(parseInt(req.params.id as string), req.body);
    if (!updated) return res.status(404).json({ message: "Invoice not found" });
    res.json(updated);
  });

  // ─── B2B Payment Integration ───────────────────────────────────────────────
  
  // M-Pesa STK Push (Initiate Payment)
  app.post("/api/payments/mpesa/initiate", requireAuth, async (req, res) => {
    try {
      const { invoiceId, phoneNumber } = req.body;
      const invoice = await storage.getInvoiceById(parseInt(invoiceId));
      
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (invoice.status === "paid") return res.status(400).json({ message: "Invoice already paid" });

      // Generate a mock transaction ID for the STK push
      const mockTxnId = `MPESA_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

      // Log the payment attempt
      await storage.createPaymentLog({
        invoiceId: invoice.id,
        method: "mpesa",
        status: "pending",
        transactionId: mockTxnId,
        amount: invoice.amount
      });

      // Update invoice status to reflect payment is processing
      await storage.updateInvoice(invoice.id, { 
        status: "pending",
        paymentMethod: "mpesa",
        paymentReference: mockTxnId
      });

      // Simulate a successful STK prompt dispatch
      res.json({ 
        message: "STK Push initiated successfully", 
        transactionId: mockTxnId,
        status: "pending"
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to initiate M-Pesa payment" });
    }
  });

  // M-Pesa Webhook Callback (Simulated Daraja Response)
  app.post("/api/payments/mpesa/webhook", async (req, res) => {
    try {
      const { transactionId, status, amount } = req.body;
      
      // Look up payment log to find the invoice
      // In a real scenario, you'd query the DB by transactionId.
      // We will perform a basic search on pending invoices for demonstration.
      const allInvoices = await storage.getInvoices();
      const invoice = allInvoices.find(i => i.paymentReference === transactionId);

      if (!invoice) return res.status(404).json({ message: "Transaction not found" });

      if (status === "success") {
        await storage.updateInvoice(invoice.id, { 
          status: "paid", 
          paidAt: new Date()
        });
        
        // Log the successful webhook
        await storage.createPaymentLog({
          invoiceId: invoice.id,
          method: "mpesa",
          status: "success",
          transactionId,
          amount: amount || invoice.amount
        });
      } else {
        await storage.updateInvoice(invoice.id, { status: "failed" });
        await storage.createPaymentLog({
          invoiceId: invoice.id,
          method: "mpesa",
          status: "failed",
          transactionId,
          amount: amount || invoice.amount
        });
      }

      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Webhook error" });
    }
  });


  // Admin Bank Transfer Verification (manual, no receipt)
  app.post("/api/admin/payments/bank/verify", requireAdmin, async (req, res) => {
    try {
      const { invoiceId, reference, amount } = req.body;
      const invoice = await storage.getInvoiceById(parseInt(invoiceId));
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (invoice.status === "paid") return res.status(400).json({ message: "Invoice already paid" });
      await storage.updateInvoice(invoice.id, { status: "paid", paymentMethod: "bank", paymentReference: reference, paidAt: new Date() });
      await storage.createPaymentLog({ invoiceId: invoice.id, method: "bank", status: "success", transactionId: reference, amount: amount || invoice.amount });
      res.json({ message: "Bank payment verified and invoice marked as paid" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to verify bank payment" });
    }
  });

  // CLIENT: Upload bank transfer receipt
  app.post("/api/payments/bank/receipt", requireAuth, upload.single("receipt"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No receipt file provided" });
      const { invoiceId } = req.body;
      if (!invoiceId) return res.status(400).json({ message: "invoiceId is required" });

      const invoice = await storage.getInvoiceById(parseInt(invoiceId));
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      // Log a pending bank payment
      const log = await storage.createPaymentLog({
        invoiceId: invoice.id,
        method: "bank",
        status: "pending",
        transactionId: null,
        amount: invoice.amount
      });

      // Store receipt
      const receipt = await storage.createBankReceipt({
        invoiceId: invoice.id,
        paymentLogId: log.id,
        fileUrl: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        verified: false
      });

      // Mark invoice as pending (awaiting admin verification)
      await storage.updateInvoice(invoice.id, { status: "pending", paymentMethod: "bank" });

      res.status(201).json({ receipt, log });
    } catch (err) {
      console.error("Receipt upload error:", err);
      res.status(500).json({ message: "Failed to upload receipt" });
    }
  });

  // ADMIN: Get receipts for an invoice
  app.get("/api/admin/invoices/:id/receipts", requireAdmin, async (req, res) => {
    try {
      const receipts = await storage.getBankReceiptsByInvoice(parseInt(req.params.id));
      res.json(receipts);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch receipts" });
    }
  });

  // ADMIN: Verify a bank receipt and mark invoice paid
  app.post("/api/admin/invoices/:id/receipts/:receiptId/verify", requireAdmin, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      const receiptId = parseInt(req.params.receiptId);
      const invoice = await storage.getInvoiceById(invoiceId);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });

      await storage.verifyBankReceipt(receiptId);
      await storage.updateInvoice(invoiceId, { status: "paid", paidAt: new Date() });
      res.json({ message: "Receipt verified and invoice marked as paid" });
    } catch (err) {
      res.status(500).json({ message: "Failed to verify receipt" });
    }
  });

  // ADMIN: Get Payment Gateway Settings
  app.get("/api/admin/settings/payment", requireAdmin, async (req, res) => {
    try {
      const allSettings = await storage.getAllSettings();
      // Only return the relevant payment settings
      res.json({
        mpesa_shortcode: allSettings["mpesa_shortcode"] || "",
        mpesa_passkey: allSettings["mpesa_passkey"] || "",
        mpesa_consumer_key: allSettings["mpesa_consumer_key"] || "",
        mpesa_consumer_secret: allSettings["mpesa_consumer_secret"] || "",
        bank_details: allSettings["bank_details"] || "",
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  // ADMIN: Update Payment Gateway Settings
  app.post("/api/admin/settings/payment", requireAdmin, async (req, res) => {
    try {
      const keys = ["mpesa_shortcode", "mpesa_passkey", "mpesa_consumer_key", "mpesa_consumer_secret", "bank_details"];
      for (const key of keys) {
        if (req.body[key] !== undefined) {
           await storage.setSetting(key, req.body[key]);
        }
      }
      res.json({ message: "Payment settings updated successfully" });
    } catch (err) {
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // PORTAL: Get Public Bank Details
  app.get("/api/portal/settings/bank", requireAuth, async (req, res) => {
    try {
      const bankDetails = await storage.getSetting("bank_details");
      res.json({ bank_details: bankDetails || "" });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch bank details" });
    }
  });

  // PORTAL: Get invoices for the logged-in client
  app.get("/api/portal/invoices", requireAuth, async (req, res) => {
    const clientId = req.session.userId!;
    const allInvoices = await storage.getInvoices(clientId);
    res.json(allInvoices);
  });

  // Real M-Pesa Daraja STK Push
  app.post("/api/payments/mpesa/stkpush", requireAuth, async (req, res) => {
    try {
      const { invoiceId, phone } = req.body;
      if (!invoiceId || !phone) return res.status(400).json({ message: "invoiceId and phone are required" });

      const invoice = await storage.getInvoiceById(parseInt(invoiceId));
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (invoice.status === "paid") return res.status(400).json({ message: "Invoice already paid" });

      // Fetch dynamic settings from DB, fallback to env
      const dbShortcode = await storage.getSetting("mpesa_shortcode");
      const dbPasskey = await storage.getSetting("mpesa_passkey");
      const dbConsumerKey = await storage.getSetting("mpesa_consumer_key");
      const dbConsumerSecret = await storage.getSetting("mpesa_consumer_secret");

      const shortcode = dbShortcode || process.env.MPESA_SHORTCODE;
      const passkey = dbPasskey || process.env.MPESA_PASSKEY;
      const consumerKey = dbConsumerKey || process.env.MPESA_CONSUMER_KEY;
      const consumerSecret = dbConsumerSecret || process.env.MPESA_CONSUMER_SECRET;
      const apiUrl = process.env.MPESA_API_URL || "https://sandbox.safaricom.co.ke";
      const callbackUrl = `${process.env.API_URL || "https://nexasync.onrender.com"}/api/mpesa/callback`;

      // Fallback to mock if no Daraja credentials
      if (!shortcode || !passkey || !consumerKey || !consumerSecret) {
        const mockTxnId = `MPESA_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
        await storage.createPaymentLog({ invoiceId: invoice.id, method: "mpesa", status: "pending", transactionId: mockTxnId, amount: invoice.amount });
        await storage.updateInvoice(invoice.id, { status: "pending", paymentMethod: "mpesa", paymentReference: mockTxnId });
        return res.json({ message: "STK Push simulated (no Daraja credentials)", transactionId: mockTxnId, status: "pending" });
      }

      // Get OAuth token
      const tokenRes = await fetch(`${apiUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}` }
      });
      const { access_token } = await tokenRes.json() as any;

      // Build STK push request
      const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
      const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
      const normalizedPhone = phone.startsWith("0") ? `254${phone.slice(1)}` : phone;

      const stkRes = await fetch(`${apiUrl}/mpesa/stkpush/v1/processrequest`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: invoice.amount,
          PartyA: normalizedPhone,
          PartyB: shortcode,
          PhoneNumber: normalizedPhone,
          CallBackURL: callbackUrl,
          AccountReference: `INV-${invoice.id}`,
          TransactionDesc: `Payment for Invoice #${invoice.id}`
        })
      });
      const stkData = await stkRes.json() as any;

      const checkoutId = stkData.CheckoutRequestID;
      await storage.createPaymentLog({ invoiceId: invoice.id, method: "mpesa", status: "pending", transactionId: checkoutId, amount: invoice.amount });
      await storage.updateInvoice(invoice.id, { status: "pending", paymentMethod: "mpesa", paymentReference: checkoutId });

      res.json({ message: "STK Push sent", checkoutRequestId: checkoutId, status: "pending" });
    } catch (err) {
      console.error("STK Push error:", err);
      res.status(500).json({ message: "Failed to initiate M-Pesa payment" });
    }
  });

  // M-Pesa Daraja Callback
  app.post("/api/mpesa/callback", async (req, res) => {
    try {
      const result = req.body?.Body?.stkCallback;
      if (!result) return res.sendStatus(200);

      const checkoutId = result.CheckoutRequestID;
      const allInvoices = await storage.getInvoices();
      const invoice = allInvoices.find(i => i.paymentReference === checkoutId);
      if (!invoice) return res.sendStatus(200);

      if (result.ResultCode === 0) {
        const items = result.CallbackMetadata?.Item || [];
        const txnId = items.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value || checkoutId;
        const amount = items.find((i: any) => i.Name === "Amount")?.Value || invoice.amount;
        await storage.updateInvoice(invoice.id, { status: "paid", paidAt: new Date(), paymentReference: txnId });
        await storage.createPaymentLog({ invoiceId: invoice.id, method: "mpesa", status: "success", transactionId: txnId, amount });
      } else {
        await storage.updateInvoice(invoice.id, { status: "unpaid" });
        await storage.createPaymentLog({ invoiceId: invoice.id, method: "mpesa", status: "failed", transactionId: checkoutId, amount: invoice.amount });
      }
      res.sendStatus(200);
    } catch (err) {
      console.error("M-Pesa callback error:", err);
      res.sendStatus(200);
    }
  });



  // ─── Messaging (Refactored) ────────────────────────────────────────────────
  app.get("/api/projects/:projectId/messages", requireAuth, async (req, res) => {
    const projectId = parseInt(req.params.projectId as string);
    try {
      const conv = await storage.getConversationByProjectId(projectId);
      const messages = await storage.getMessagesByConversationId(conv.id);

      // Update read status
      const user = await storage.getUserById(req.session.userId!);
      if (user?.role === "admin") {
        await storage.updateConversationStatus(conv.id, { adminLastReadAt: new Date() });
      } else {
        await storage.updateConversationStatus(conv.id, { clientLastReadAt: new Date() });
      }

      res.json(messages);
    } catch (err) {
      res.status(500).json({ message: "Failed to load messages" });
    }
  });

  app.post("/api/messages", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const { projectId, content, senderRole } = req.body;
      const senderId = req.session.userId!;
      const pid = parseInt(projectId);

      const conv = await storage.getConversationByProjectId(pid);
      const msg = await storage.createMessage({
        conversationId: conv.id,
        content: content || null,
        senderRole,
        senderId
      });

      const attachmentsList = [];
      if (req.file) {
        const att = await storage.createAttachment({
          messageId: msg.id,
          fileName: req.file.originalname,
          fileUrl: `/uploads/${req.file.filename}`
        });
        attachmentsList.push(att);
      }

      const fullMsg = { ...msg, attachments: attachmentsList };
      io.to(`project_${pid}`).emit("receiveMessage", fullMsg);
      res.status(201).json(fullMsg);
    } catch (err) {
      console.error("Message send error:", err);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ── ADMIN: Update Requests ────────────────────────────────────────────────
  app.get("/api/admin/update-requests", requireAdmin, async (req, res) => {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    res.json(await storage.getUpdateRequests(projectId));
  });

  app.post("/api/admin/update-requests/:id/reply", requireAdmin, async (req, res) => {
    try {
      const { reply } = req.body;
      const updated = await storage.replyToUpdateRequest(parseInt(req.params.id as string), reply);
      if (!updated) return res.status(404).json({ message: "Update request not found" });
      res.json(updated);
    } catch (err) {
      res.status(400).json({ message: "Invalid request" });
    }
  });

  // ── ADMIN: Files ──────────────────────────────────────────────────────────
  app.get("/api/admin/files", requireAdmin, async (req, res) => {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    if (!projectId) return res.status(400).json({ message: "projectId is required" });
    res.json(await storage.getFilesByProject(projectId));
  });

  app.post("/api/admin/files", requireAdmin, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const projectId = parseInt(req.body.projectId);
      const fileRecord = await storage.createFile({
        projectId,
        uploadedBy: req.session.userId!,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });
      res.status(201).json(fileRecord);
    } catch (err) {
      res.status(400).json({ message: "Upload failed" });
    }
  });

  app.delete("/api/admin/files/:id", requireAdmin, async (req, res) => {
    const fileId = parseInt(req.params.id as string);
    const fileRecord = await storage.getFileById(fileId);
    if (!fileRecord) return res.status(404).json({ message: "File not found" });

    // Delete physical file
    const filePath = path.join(uploadDir, fileRecord.fileName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await storage.deleteFile(fileId);
    res.status(204).end();
  });

  // ── PORTAL: Client Routes ──────────────────────────────────────────────────
  app.get("/api/portal/projects", requireAuth, async (req, res) => {
    const clientId = req.session.userId!;
    res.json(await storage.getProjectsByClientId(clientId));
  });

  // ── PORTAL: Quotes ────────────────────────────────────────────────────────
  app.get("/api/portal/quotes", requireAuth, async (req, res) => {
    // Return quotes that match the logged-in client's email
    const user = await storage.getUserById(req.session.userId!);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const allQuotes = await storage.getQuotes();
    const myQuotes = allQuotes.filter(q => q.email === user.email);
    res.json(myQuotes);
  });

  app.post("/api/portal/quotes/:id/approve", requireAuth, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id as string);
      const quote = await storage.getQuoteById(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      // Verify ownership by email
      const user = await storage.getUserById(req.session.userId!);
      if (!user || quote.email !== user.email) return res.status(403).json({ message: "Forbidden" });
      if (quote.status === "approved") return res.status(400).json({ message: "Quote already approved" });

      // Mark quote approved
      await storage.updateQuote(quoteId, { status: "approved" });

      // Auto-create project for this client
      const project = await storage.createProject({
        title: `Project: ${quote.projectDetails.slice(0, 50)}`,
        description: quote.projectDetails,
        status: "active",
        clientId: user.id,
        budget: quote.estimatedPrice ?? 0,
        progress: 0,
      });

      // Welcome message in the new chat system
      const conv = await storage.getConversationByProjectId(project.id);
      await storage.createMessage({
        conversationId: conv.id,
        senderRole: "admin",
        senderId: 1, // System Admin (id=1)
        content: `🎉 Your quote has been approved and this project has been created! We will be in touch shortly to discuss next steps.`
      });

      res.status(201).json({ quote, project });
    } catch (err) {
      console.error("Quote approval error:", err);
      res.status(500).json({ message: "Failed to approve quote" });
    }
  });

  app.post("/api/portal/quotes/:id/reject", requireAuth, async (req, res) => {
    try {
      const quoteId = parseInt(req.params.id as string);
      const quote = await storage.getQuoteById(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const user = await storage.getUserById(req.session.userId!);
      if (!user || quote.email !== user.email) return res.status(403).json({ message: "Forbidden" });

      await storage.updateQuote(quoteId, { status: "rejected" });
      res.json({ message: "Quote rejected" });
    } catch (err) {
      res.status(500).json({ message: "Failed to reject quote" });
    }
  });

  app.get("/api/portal/invoices", requireAuth, async (req, res) => {
    const clientId = req.session.userId!;
    res.json(await storage.getInvoices(clientId));
  });

  // ── PORTAL: Milestones ────────────────────────────────────────────────────
  app.get("/api/portal/milestones", requireAuth, async (req, res) => {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    if (!projectId) return res.status(400).json({ message: "projectId is required" });

    // Auth check
    const projects = await storage.getProjectsByClientId(req.session.userId!);
    if (!projects.some(p => p.id === projectId)) return res.status(403).json({ message: "Forbidden" });

    res.json(await storage.getMilestones(projectId));
  });

  // ── PORTAL: Update Requests ───────────────────────────────────────────────
  app.get("/api/portal/update-requests", requireAuth, async (req, res) => {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    res.json(await storage.getUpdateRequests(projectId, req.session.userId));
  });

  app.post("/api/portal/update-requests", requireAuth, async (req, res) => {
    try {
      const input = insertUpdateRequestSchema.parse({ ...req.body, userId: req.session.userId });
      res.status(201).json(await storage.createUpdateRequest(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // ── PORTAL: Files ─────────────────────────────────────────────────────────
  app.get("/api/portal/files", requireAuth, async (req, res) => {
    const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
    if (!projectId) return res.status(400).json({ message: "projectId is required" });
    // Verify client owns the project
    const projects = await storage.getProjectsByClientId(req.session.userId!);
    if (!projects.some(p => p.id === projectId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    res.json(await storage.getFilesByProject(projectId));
  });

  app.post("/api/portal/files", requireAuth, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const projectId = parseInt(req.body.projectId);

      // Verify client owns the project
      const projects = await storage.getProjectsByClientId(req.session.userId!);
      if (!projects.some(p => p.id === projectId)) {
        // Cleanup uploaded file since forbidden
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: "Forbidden" });
      }

      const fileRecord = await storage.createFile({
        projectId,
        uploadedBy: req.session.userId!,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });
      res.status(201).json(fileRecord);
    } catch (err) {
      // Cleanup on error
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(400).json({ message: "Upload failed" });
    }
  });

  // Download Route (used by both Admin & Portal)
  app.get("/api/files/:id/download", requireAuth, async (req, res) => {
    const fileRecord = await storage.getFileById(parseInt(req.params.id as string));
    if (!fileRecord) return res.status(404).json({ message: "File not found" });

    // Restrict to owner or admin
    if (req.session.userRole !== "admin") {
      const projects = await storage.getProjectsByClientId(req.session.userId!);
      if (!projects.some(p => p.id === fileRecord.projectId)) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const filePath = path.join(uploadDir, fileRecord.fileName);
    if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File missing from disk" });

    res.download(filePath, fileRecord.originalName);
  });

  // ── Seed Default Data ─────────────────────────────────────────────────────
  const existingServices = await storage.getServices();
  if (existingServices.length === 0) {
    const defaultServices = [
      { title: "Graphic Design", description: "Creative and professional graphic designs tailored to your brand identity.", icon: "Palette", basePrice: 500 },
      { title: "Web Design", description: "Modern, responsive, and user-friendly websites built for performance.", icon: "Monitor", basePrice: 1500 },
      { title: "E-Commerce Solutions", description: "Robust online stores designed to maximize conversions and sales.", icon: "ShoppingCart", basePrice: 3000 },
      { title: "POS Designs", description: "Efficient Point of Sale systems to streamline your daily operations.", icon: "CreditCard", basePrice: 2000 },
      { title: "Networking Services", description: "Reliable and secure networking solutions to keep your business connected.", icon: "Network", basePrice: 1000 },
    ];
    for (const s of defaultServices) await storage.createService(s);
  }

  // Seed default admin account
  const existingAdmin = await storage.getUserByEmail("admin@wchch.dev");
  if (!existingAdmin) {
    await storage.createUser({
      name: "Admin",
      email: "admin@wchch.dev",
      passwordHash: hashPassword("wchch"),
      role: "admin",
    });
  }

  return httpServer;
}
