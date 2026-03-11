import { mysqlTable, text, int, timestamp, boolean, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Services ────────────────────────────────────────────────────────────────
export const services = mysqlTable("services", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 255 }).notNull(),
  basePrice: int("base_price").default(0),
});

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("client"),
  company: varchar("company", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Projects ────────────────────────────────────────────────────────────────
export const projects = mysqlTable("projects", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  clientId: int("client_id").references(() => users.id),
  serviceId: int("service_id").references(() => services.id),
  deadline: timestamp("deadline"),
  budget: int("budget"),
  progress: int("progress").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// ─── Tasks ────────────────────────────────────────────────────────────────────
export const tasks = mysqlTable("tasks", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  projectId: int("project_id").references(() => projects.id),
  assignedTo: int("assigned_to").references(() => users.id),
  status: varchar("status", { length: 50 }).notNull().default("todo"),
  priority: varchar("priority", { length: 50 }).notNull().default("medium"),
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Milestones ───────────────────────────────────────────────────────────────
export const milestones = mysqlTable("milestones", {
  id: int("id").primaryKey().autoincrement(),
  title: varchar("title", { length: 255 }).notNull(),
  projectId: int("project_id").references(() => projects.id),
  dueDate: timestamp("due_date"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Quotes ───────────────────────────────────────────────────────────────────
export const quotes = mysqlTable("quotes", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  serviceIds: text("service_ids").notNull(),
  projectDetails: text("project_details").notNull(),
  budget: varchar("budget", { length: 100 }),
  timeline: varchar("timeline", { length: 100 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  estimatedPrice: int("estimated_price"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Contact Messages ─────────────────────────────────────────────────────────
export const contactMessages = mysqlTable("contact_messages", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Project Comments ─────────────────────────────────────────────────────────
export const projectComments = mysqlTable("project_comments", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").references(() => projects.id),
  userId: int("user_id").references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Invoices ─────────────────────────────────────────────────────────────────
export const invoices = mysqlTable("invoices", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").references(() => projects.id),
  clientId: int("client_id").references(() => users.id),
  amount: int("amount").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("unpaid"), // pending, paid, partially_paid, unpaid
  paymentMethod: varchar("payment_method", { length: 50 }), // mpesa, bank
  paymentReference: varchar("payment_reference", { length: 255 }), // txn id
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Payment Logs ─────────────────────────────────────────────────────────────
export const paymentLogs = mysqlTable("payment_logs", {
  id: int("id").primaryKey().autoincrement(),
  invoiceId: int("invoice_id").notNull().references(() => invoices.id),
  method: varchar("method", { length: 50 }).notNull(), // mpesa, bank
  status: varchar("status", { length: 50 }).notNull(), // pending, success, failed
  transactionId: varchar("transaction_id", { length: 255 }),
  amount: int("amount").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Bank Payment Receipts ───────────────────────────────────────────────────
export const bankPaymentReceipts = mysqlTable("bank_payment_receipts", {
  id: int("id").primaryKey().autoincrement(),
  paymentLogId: int("payment_log_id").references(() => paymentLogs.id),
  invoiceId: int("invoice_id").notNull().references(() => invoices.id),
  fileUrl: text("file_url").notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  verified: boolean("verified").default(false),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow()
});

// ─── Project Files ────────────────────────────────────────────────────────────
export const projectFiles = mysqlTable("project_files", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").references(() => projects.id),
  uploadedBy: int("uploaded_by").references(() => users.id),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: int("size").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Update Requests ──────────────────────────────────────────────────────────
export const updateRequests = mysqlTable("update_requests", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").references(() => projects.id),
  userId: int("user_id").references(() => users.id),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  adminReply: text("admin_reply"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── WhatsApp Leads ───────────────────────────────────────────────────────────
export const whatsappLeads = mysqlTable("whatsapp_leads", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  service: varchar("service", { length: 255 }),
  message: text("message"),
  status: varchar("status", { length: 50 }).notNull().default("new"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ─── Messaging (Refactored) ──────────────────────────────────────────────────
export const conversations = mysqlTable("conversations", {
  id: int("id").primaryKey().autoincrement(),
  projectId: int("project_id").notNull().references(() => projects.id),
  adminLastReadAt: timestamp("admin_last_read_at").defaultNow(),
  clientLastReadAt: timestamp("client_last_read_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = mysqlTable("messages", {
  id: int("id").primaryKey().autoincrement(),
  conversationId: int("conversation_id").notNull().references(() => conversations.id),
  senderRole: varchar("sender_role", { length: 50 }).notNull(), // 'admin' | 'client'
  senderId: int("sender_id").notNull().references(() => users.id),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const attachments = mysqlTable("attachments", {
  id: int("id").primaryKey().autoincrement(),
  messageId: int("message_id").notNull().references(() => messages.id),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: text("file_url").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// ─── Zod Schemas ─────────────────────────────────────────────────────────────
export const insertServiceSchema = createInsertSchema(services).omit({ id: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true });
export const insertMilestoneSchema = createInsertSchema(milestones).omit({ id: true, createdAt: true });
export const insertQuoteSchema = createInsertSchema(quotes).omit({ id: true, createdAt: true, status: true, estimatedPrice: true });
export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({ id: true, createdAt: true, read: true });
export const insertProjectCommentSchema = createInsertSchema(projectComments).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true, paidAt: true });
export const insertPaymentLogSchema = createInsertSchema(paymentLogs).omit({ id: true, createdAt: true });
export const insertBankPaymentReceiptSchema = createInsertSchema(bankPaymentReceipts).omit({ id: true, uploadedAt: true });
export const insertProjectFileSchema = createInsertSchema(projectFiles).omit({ id: true, createdAt: true });
export const insertUpdateRequestSchema = createInsertSchema(updateRequests).omit({ id: true, createdAt: true, status: true, adminReply: true });
export const insertWhatsappLeadSchema = createInsertSchema(whatsappLeads).omit({ id: true, createdAt: true, status: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertAttachmentSchema = createInsertSchema(attachments).omit({ id: true, uploadedAt: true });

export const signUpSchema = z.object({
  clientName: z.string().min(2, "Name is required"),
  companyName: z.string().optional(),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  servicesInterested: z.string().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type PublicUser = Omit<User, "passwordHash">;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Milestone = typeof milestones.$inferSelect;
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;

export type Quote = typeof quotes.$inferSelect;
export type InsertQuote = z.infer<typeof insertQuoteSchema>;

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;

export type ProjectComment = typeof projectComments.$inferSelect;
export type InsertProjectComment = z.infer<typeof insertProjectCommentSchema>;

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

export type PaymentLog = typeof paymentLogs.$inferSelect;
export type InsertPaymentLog = z.infer<typeof insertPaymentLogSchema>;

export type BankPaymentReceipt = typeof bankPaymentReceipts.$inferSelect;
export type InsertBankPaymentReceipt = z.infer<typeof insertBankPaymentReceiptSchema>;

export type ProjectFile = typeof projectFiles.$inferSelect;
export type InsertProjectFile = z.infer<typeof insertProjectFileSchema>;

export type InsertUpdateRequest = z.infer<typeof insertUpdateRequestSchema>;

export type WhatsappLead = typeof whatsappLeads.$inferSelect;
export type InsertWhatsappLead = z.infer<typeof insertWhatsappLeadSchema>;

export const insertSettingSchema = createInsertSchema(settings);
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type InsertWhatsappLead = z.infer<typeof insertWhatsappLeadSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

// Aliases
export type CreateServiceRequest = InsertService;
export type CreateContactMessageRequest = InsertContactMessage;
export type ServiceResponse = Service;
export type ContactMessageResponse = ContactMessage;
