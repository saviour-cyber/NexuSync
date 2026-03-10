import { db } from "./db";
import {
  services, users, projects, tasks, milestones, quotes, contactMessages, projectComments, invoices,
  projectFiles, updateRequests, whatsappLeads,
  type Service, type InsertService,
  type User, type InsertUser, type PublicUser,
  type Project, type InsertProject,
  type Task, type InsertTask,
  type Milestone, type InsertMilestone,
  type Quote, type InsertQuote,
  type ContactMessage, type InsertContactMessage,
  type ProjectComment, type InsertProjectComment,
  type Invoice, type InsertInvoice,
  type ProjectFile, type InsertProjectFile,
  type UpdateRequest, type InsertUpdateRequest,
  type WhatsappLead, type InsertWhatsappLead,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type Attachment, type InsertAttachment,
  type CreateServiceRequest, type CreateContactMessageRequest,
  type ServiceResponse, type ContactMessageResponse,
  paymentLogs, type PaymentLog, type InsertPaymentLog
} from "@shared/schema";
import { conversations, messages, attachments } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import crypto from "node:crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "nexasync_salt").digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export { hashPassword };

// ─── Interface ────────────────────────────────────────────────────────────────
export interface IStorage {
  // Services
  getServices(): Promise<ServiceResponse[]>;
  createService(service: CreateServiceRequest): Promise<ServiceResponse>;
  updateService(id: number, service: Partial<InsertService>): Promise<ServiceResponse | undefined>;
  deleteService(id: number): Promise<void>;

  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getClients(): Promise<PublicUser[]>;
  createUser(user: InsertUser): Promise<PublicUser>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProjectsByClientId(clientId: number): Promise<Project[]>;
  getProjectById(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;

  // Tasks
  getTasks(projectId?: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;

  // Milestones
  getMilestones(projectId?: number): Promise<Milestone[]>;
  createMilestone(milestone: InsertMilestone): Promise<Milestone>;
  updateMilestone(id: number, milestone: Partial<InsertMilestone>): Promise<Milestone | undefined>;

  // Quotes
  getQuotes(): Promise<Quote[]>;
  getQuoteById(id: number): Promise<Quote | undefined>;
  createQuote(quote: InsertQuote): Promise<Quote>;
  updateQuote(id: number, data: Partial<Quote>): Promise<Quote | undefined>;

  // Contact Messages
  getContactMessages(): Promise<ContactMessage[]>;
  createContactMessage(message: CreateContactMessageRequest): Promise<ContactMessageResponse>;
  markMessageRead(id: number): Promise<void>;

  // Comments
  getComments(projectId?: number): Promise<ProjectComment[]>;
  createComment(comment: InsertProjectComment): Promise<ProjectComment>;

  // Invoices & Payments
  getInvoices(clientId?: number): Promise<Invoice[]>;
  getInvoiceById(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice | undefined>;

  getPaymentLogsByInvoice(invoiceId: number): Promise<PaymentLog[]>;
  createPaymentLog(log: InsertPaymentLog): Promise<PaymentLog>;

  // Project Files
  getFilesByProject(projectId: number): Promise<ProjectFile[]>;
  createFile(file: InsertProjectFile): Promise<ProjectFile>;
  getFileById(id: number): Promise<ProjectFile | undefined>;
  deleteFile(id: number): Promise<void>;

  // Update Requests
  getUpdateRequests(projectId?: number, userId?: number): Promise<UpdateRequest[]>;
  createUpdateRequest(req: InsertUpdateRequest): Promise<UpdateRequest>;
  replyToUpdateRequest(id: number, reply: string): Promise<UpdateRequest | undefined>;

  // WhatsApp Leads
  getWhatsappLeads(): Promise<WhatsappLead[]>;
  getWhatsappLeadById(id: number): Promise<WhatsappLead | undefined>;
  createWhatsappLead(lead: InsertWhatsappLead): Promise<WhatsappLead>;
  updateWhatsappLeadStatus(id: number, status: string): Promise<WhatsappLead | undefined>;

  // Messaging (Refactored)
  getConversationByProjectId(projectId: number): Promise<Conversation>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversationId(conversationId: number): Promise<(Message & { attachments: Attachment[] })[]>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  updateConversationStatus(id: number, data: { adminLastReadAt?: Date; clientLastReadAt?: Date }): Promise<void>;
  migrateCommentsToMessages(): Promise<void>;

  // Analytics
  getAnalytics(): Promise<any>;
}

// ─── MemStorage ───────────────────────────────────────────────────────────────
export class MemStorage implements IStorage {
  private _services: Service[] = [];
  private _users: User[] = [];
  private _projects: Project[] = [];
  private _tasks: Task[] = [];
  private _milestones: Milestone[] = [];
  private _quotes: Quote[] = [];
  private _messages: ContactMessage[] = [];
  private _comments: ProjectComment[] = [];
  private _invoices: Invoice[] = [];
  private _paymentLogs: PaymentLog[] = [];
  private _id = 1;
  private nextId() { return this._id++; }

  // ── Services
  async getServices() { return this._services; }
  async createService(s: InsertService): Promise<Service> {
    const item: Service = { ...s, id: this.nextId(), basePrice: s.basePrice ?? 0 };
    this._services.push(item);
    return item;
  }
  async updateService(id: number, s: Partial<InsertService>): Promise<Service | undefined> {
    const i = this._services.findIndex(x => x.id === id);
    if (i === -1) return undefined;
    this._services[i] = { ...this._services[i], ...s };
    return this._services[i];
  }
  async deleteService(id: number) {
    this._services = this._services.filter(x => x.id !== id);
  }

  // ── Users
  async getUserByEmail(email: string) { return this._users.find(u => u.email === email); }
  async getUserById(id: number) { return this._users.find(u => u.id === id); }
  async getClients(): Promise<PublicUser[]> {
    return this._users.filter(u => u.role === "client").map(({ passwordHash, ...rest }) => rest);
  }
  async createUser(u: InsertUser): Promise<PublicUser> {
    const user: User = {
      ...u, id: this.nextId(),
      role: u.role ?? "client",
      company: u.company ?? null,
      phone: u.phone ?? null,
      createdAt: new Date(),
    };
    this._users.push(user);
    const { passwordHash, ...pub } = user;
    return pub;
  }

  // ── Projects
  async getProjects() { return this._projects; }
  async getProjectsByClientId(clientId: number) { return this._projects.filter(p => p.clientId === clientId); }
  async getProjectById(id: number) { return this._projects.find(p => p.id === id); }
  async createProject(p: InsertProject): Promise<Project> {
    const item: Project = {
      ...p, id: this.nextId(), createdAt: new Date(), updatedAt: new Date(),
      status: p.status ?? "active",
      description: p.description ?? null,
      clientId: p.clientId ?? null,
      serviceId: p.serviceId ?? null,
      deadline: p.deadline ? new Date(p.deadline as any) : null,
      budget: p.budget ?? null,
      progress: p.progress ?? 0,
    };
    this._projects.push(item);
    return item;
  }
  async updateProject(id: number, p: Partial<InsertProject>): Promise<Project | undefined> {
    const i = this._projects.findIndex(x => x.id === id);
    if (i === -1) return undefined;
    this._projects[i] = { ...this._projects[i], ...p, updatedAt: new Date() };
    return this._projects[i];
  }
  async deleteProject(id: number) {
    this._projects = this._projects.filter(x => x.id !== id);
  }

  // ── Tasks
  async getTasks(projectId?: number) {
    return projectId ? this._tasks.filter(t => t.projectId === projectId) : this._tasks;
  }
  async createTask(t: InsertTask): Promise<Task> {
    const item: Task = {
      ...t, id: this.nextId(), createdAt: new Date(),
      status: t.status ?? "todo",
      priority: t.priority ?? "medium",
      description: t.description ?? null,
      projectId: t.projectId ?? null,
      assignedTo: t.assignedTo ?? null,
      deadline: t.deadline ? new Date(t.deadline as any) : null,
    };
    this._tasks.push(item);
    return item;
  }
  async updateTask(id: number, t: Partial<InsertTask>): Promise<Task | undefined> {
    const i = this._tasks.findIndex(x => x.id === id);
    if (i === -1) return undefined;
    this._tasks[i] = { ...this._tasks[i], ...t };
    return this._tasks[i];
  }

  // ── Milestones
  async getMilestones(projectId?: number) {
    return projectId ? this._milestones.filter(m => m.projectId === projectId) : this._milestones;
  }
  async createMilestone(m: InsertMilestone): Promise<Milestone> {
    const item: Milestone = {
      ...m, id: this.nextId(), createdAt: new Date(),
      projectId: m.projectId ?? null,
      dueDate: m.dueDate ? new Date(m.dueDate as any) : null,
      completed: m.completed ?? false,
    };
    this._milestones.push(item);
    return item;
  }
  async updateMilestone(id: number, m: Partial<InsertMilestone>): Promise<Milestone | undefined> {
    const i = this._milestones.findIndex(x => x.id === id);
    if (i === -1) return undefined;
    this._milestones[i] = { ...this._milestones[i], ...m };
    return this._milestones[i];
  }

  // ── Quotes
  async getQuotes() { return this._quotes; }
  async getQuoteById(id: number) { return this._quotes.find(q => q.id === id); }
  async createQuote(q: InsertQuote): Promise<Quote> {
    const item: Quote = {
      ...q, id: this.nextId(), createdAt: new Date(), status: "pending", estimatedPrice: null,
      phone: q.phone ?? null,
      budget: q.budget ?? null,
      timeline: q.timeline ?? null,
    };
    this._quotes.push(item);
    return item;
  }
  async updateQuote(id: number, data: Partial<Quote>): Promise<Quote | undefined> {
    const i = this._quotes.findIndex(x => x.id === id);
    if (i === -1) return undefined;
    this._quotes[i] = { ...this._quotes[i], ...data };
    return this._quotes[i];
  }

  // ── Messages
  async getContactMessages() { return this._messages; }
  async createContactMessage(m: InsertContactMessage): Promise<ContactMessage> {
    const item: ContactMessage = {
      ...m, id: this.nextId(), createdAt: new Date(), read: false,
      phone: m.phone ?? null,
    };
    this._messages.push(item);
    return item;
  }
  async markMessageRead(id: number) {
    const m = this._messages.find(x => x.id === id);
    if (m) m.read = true;
  }

  // ── Comments
  async getComments(projectId?: number) {
    return projectId ? this._comments.filter(c => c.projectId === projectId) : this._comments;
  }
  async createComment(c: InsertProjectComment): Promise<ProjectComment> {
    const item: ProjectComment = {
      ...c, id: this.nextId(), createdAt: new Date(),
      projectId: c.projectId ?? null,
      userId: c.userId ?? null,
    };
    this._comments.push(item);
    return item;
  }

  // ── Invoices & Payments
  async getInvoices(clientId?: number) {
    return clientId ? this._invoices.filter(i => i.clientId === clientId) : this._invoices;
  }
  async getInvoiceById(id: number) {
    return this._invoices.find(i => i.id === id);
  }
  async createInvoice(inv: InsertInvoice): Promise<Invoice> {
    const item: Invoice = {
      ...inv, id: this.nextId(), createdAt: new Date(), paidAt: null,
      status: inv.status ?? "unpaid",
      paymentMethod: inv.paymentMethod ?? null,
      paymentReference: inv.paymentReference ?? null,
      projectId: inv.projectId ?? null,
      clientId: inv.clientId ?? null,
      dueDate: inv.dueDate ? new Date(inv.dueDate as any) : null,
    };
    this._invoices.push(item);
    return item;
  }
  async updateInvoice(id: number, data: Partial<Invoice>): Promise<Invoice | undefined> {
    const i = this._invoices.findIndex(x => x.id === id);
    if (i === -1) return undefined;
    this._invoices[i] = { ...this._invoices[i], ...data };
    return this._invoices[i];
  }
  
  async getPaymentLogsByInvoice(invoiceId: number) {
    return this._paymentLogs.filter(p => p.invoiceId === invoiceId);
  }
  async createPaymentLog(log: InsertPaymentLog): Promise<PaymentLog> {
    const item: PaymentLog = {
      ...log, id: this.nextId(), createdAt: new Date(),
      transactionId: log.transactionId ?? null,
    };
    this._paymentLogs.push(item);
    return item;
  }

  // ── Files
  private _files: ProjectFile[] = [];
  async getFilesByProject(projectId: number) { return this._files.filter(f => f.projectId === projectId); }
  async createFile(f: InsertProjectFile): Promise<ProjectFile> {
    const item: ProjectFile = { ...f, id: this.nextId(), createdAt: new Date(), projectId: f.projectId ?? null, uploadedBy: f.uploadedBy ?? null };
    this._files.push(item);
    return item;
  }
  async getFileById(id: number) { return this._files.find(f => f.id === id); }
  async deleteFile(id: number) { this._files = this._files.filter(f => f.id !== id); }

  // ── Update Requests
  private _updateRequests: UpdateRequest[] = [];
  async getUpdateRequests(projectId?: number, userId?: number) {
    return this._updateRequests.filter(r =>
      (!projectId || r.projectId === projectId) && (!userId || r.userId === userId)
    );
  }
  async createUpdateRequest(r: InsertUpdateRequest): Promise<UpdateRequest> {
    const item: UpdateRequest = { ...r, id: this.nextId(), createdAt: new Date(), status: "pending", adminReply: null, projectId: r.projectId ?? null, userId: r.userId ?? null };
    this._updateRequests.push(item);
    return item;
  }
  async replyToUpdateRequest(id: number, reply: string) {
    const i = this._updateRequests.findIndex(x => x.id === id);
    if (i === -1) return undefined;
    this._updateRequests[i] = { ...this._updateRequests[i], adminReply: reply, status: "replied" };
    return this._updateRequests[i];
  }

  // ── WhatsApp Leads
  private _whatsappLeads: WhatsappLead[] = [];
  async getWhatsappLeads() { return this._whatsappLeads; }
  async getWhatsappLeadById(id: number) { return this._whatsappLeads.find(l => l.id === id); }
  async createWhatsappLead(l: InsertWhatsappLead): Promise<WhatsappLead> {
    const item: WhatsappLead = { ...l, id: this.nextId(), createdAt: new Date(), status: "new", service: l.service ?? null, message: l.message ?? null };
    this._whatsappLeads.push(item);
    return item;
  }
  async updateWhatsappLeadStatus(id: number, status: string) {
    const i = this._whatsappLeads.findIndex(x => x.id === id);
    if (i === -1) return undefined;
    this._whatsappLeads[i] = { ...this._whatsappLeads[i], status };
    return this._whatsappLeads[i];
  }

  // ── Analytics
  async getAnalytics() {
    const clients = this._users.filter(u => u.role === "client");
    const activeProjects = this._projects.filter(p => p.status === "active");
    const totalRevenue = this._invoices.filter(i => i.status === "paid").reduce((sum, i) => sum + i.amount, 0);
    return {
      totalClients: clients.length,
      totalProjects: this._projects.length,
      activeProjects: activeProjects.length,
      totalRevenue,
      pendingQuotes: this._quotes.filter(q => q.status === "pending").length,
      unreadMessages: this._messages.filter(m => !m.read).length,
      monthlyData: [],
    };
  }

  // ── Messaging Implementation in MemStorage
  private _conversations: Conversation[] = [];
  private _chatMessages: Message[] = [];
  private _attachments: Attachment[] = [];

  async getConversationByProjectId(projectId: number): Promise<Conversation> {
    let conv = this._conversations.find(c => c.projectId === projectId);
    if (!conv) {
      conv = { id: this.nextId(), projectId, createdAt: new Date(), adminLastReadAt: null, clientLastReadAt: null };
      this._conversations.push(conv);
    }
    return conv;
  }

  async createMessage(m: InsertMessage): Promise<Message> {
    const item: Message = { 
      ...m, 
      id: this.nextId(), 
      createdAt: new Date(),
      content: m.content ?? null
    };
    this._chatMessages.push(item);
    return item;
  }

  async getMessagesByConversationId(conversationId: number): Promise<(Message & { attachments: Attachment[] })[]> {
    const msgs = this._chatMessages.filter(m => m.conversationId === conversationId);
    return msgs.map(m => ({
      ...m,
      attachments: this._attachments.filter(a => a.messageId === m.id)
    }));
  }

  async createAttachment(a: InsertAttachment): Promise<Attachment> {
    const item: Attachment = { ...a, id: this.nextId(), uploadedAt: new Date() };
    this._attachments.push(item);
    return item;
  }

  async updateConversationStatus(id: number, data: { adminLastReadAt?: Date; clientLastReadAt?: Date }): Promise<void> {
    const i = this._conversations.findIndex(c => c.id === id);
    if (i !== -1) {
      this._conversations[i] = { ...this._conversations[i], ...data };
    }
  }

  async migrateCommentsToMessages(): Promise<void> {
    // Migration logic for MemStorage if needed
  }
}

// ─── DatabaseStorage ──────────────────────────────────────────────────────────
export class DatabaseStorage implements IStorage {

  async getServices() { return await db.select().from(services); }
  async createService(s: InsertService) {
    const [info] = await db.insert(services).values(s);
    const [res] = await db.select().from(services).where(eq(services.id, info.insertId));
    return res;
  }
  async updateService(id: number, s: Partial<InsertService>) {
    await db.update(services).set(s).where(eq(services.id, id));
    const [res] = await db.select().from(services).where(eq(services.id, id));
    return res;
  }
  async deleteService(id: number) {
    await db.delete(services).where(eq(services.id, id));
  }

  async getUserByEmail(email: string) {
    const [res] = await db.select().from(users).where(eq(users.email, email));
    return res;
  }
  async getUserById(id: number) {
    const [res] = await db.select().from(users).where(eq(users.id, id));
    return res;
  }
  async getClients(): Promise<PublicUser[]> {
    const all = await db.select().from(users).where(eq(users.role, "client"));
    return all.map(({ passwordHash, ...rest }) => rest);
  }
  async createUser(u: InsertUser): Promise<PublicUser> {
    const [info] = await db.insert(users).values(u);
    const [r] = await db.select().from(users).where(eq(users.id, info.insertId));
    const { passwordHash, ...pub } = r;
    return pub;
  }

  async getProjects() { return await db.select().from(projects); }
  async getProjectsByClientId(clientId: number) {
    return await db.select().from(projects).where(eq(projects.clientId, clientId));
  }
  async getProjectById(id: number) {
    const [res] = await db.select().from(projects).where(eq(projects.id, id));
    return res;
  }
  async createProject(p: InsertProject) {
    const [info] = await db.insert(projects).values(p);
    const [res] = await db.select().from(projects).where(eq(projects.id, info.insertId));
    return res;
  }
  async updateProject(id: number, p: Partial<InsertProject>) {
    await db.update(projects).set({ ...p, updatedAt: new Date() }).where(eq(projects.id, id));
    const [res] = await db.select().from(projects).where(eq(projects.id, id));
    return res;
  }
  async deleteProject(id: number) {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async getTasks(projectId?: number) {
    return projectId
      ? await db.select().from(tasks).where(eq(tasks.projectId, projectId))
      : await db.select().from(tasks);
  }
  async createTask(t: InsertTask) {
    const [info] = await db.insert(tasks).values(t);
    const [res] = await db.select().from(tasks).where(eq(tasks.id, info.insertId));
    return res;
  }
  async updateTask(id: number, t: Partial<InsertTask>) {
    await db.update(tasks).set(t).where(eq(tasks.id, id));
    const [res] = await db.select().from(tasks).where(eq(tasks.id, id));
    return res;
  }

  async getMilestones(projectId?: number) {
    return projectId
      ? await db.select().from(milestones).where(eq(milestones.projectId, projectId))
      : await db.select().from(milestones);
  }
  async createMilestone(m: InsertMilestone) {
    const [info] = await db.insert(milestones).values(m);
    const [res] = await db.select().from(milestones).where(eq(milestones.id, info.insertId));
    return res;
  }
  async updateMilestone(id: number, m: Partial<InsertMilestone>) {
    await db.update(milestones).set(m).where(eq(milestones.id, id));
    const [res] = await db.select().from(milestones).where(eq(milestones.id, id));
    return res;
  }

  async getQuotes() { return await db.select().from(quotes); }
  async getQuoteById(id: number) {
    const [res] = await db.select().from(quotes).where(eq(quotes.id, id));
    return res;
  }
  async createQuote(q: InsertQuote) {
    const [info] = await db.insert(quotes).values(q);
    const [res] = await db.select().from(quotes).where(eq(quotes.id, info.insertId));
    return res;
  }
  async updateQuote(id: number, data: Partial<Quote>) {
    await db.update(quotes).set(data as any).where(eq(quotes.id, id));
    const [res] = await db.select().from(quotes).where(eq(quotes.id, id));
    return res;
  }

  async getContactMessages() { return await db.select().from(contactMessages); }
  async createContactMessage(m: InsertContactMessage) {
    const [info] = await db.insert(contactMessages).values(m);
    const [res] = await db.select().from(contactMessages).where(eq(contactMessages.id, info.insertId));
    return res;
  }
  async markMessageRead(id: number) {
    await db.update(contactMessages).set({ read: true }).where(eq(contactMessages.id, id));
  }

  async getComments(projectId?: number) {
    return projectId
      ? await db.select().from(projectComments).where(eq(projectComments.projectId, projectId))
      : await db.select().from(projectComments);
  }
  async createComment(c: InsertProjectComment) {
    const [info] = await db.insert(projectComments).values(c);
    const [res] = await db.select().from(projectComments).where(eq(projectComments.id, info.insertId));
    return res;
  }

  async getInvoices(clientId?: number) {
    return clientId
      ? await db.select().from(invoices).where(eq(invoices.clientId, clientId))
      : await db.select().from(invoices);
  }
  async getInvoiceById(id: number) {
    const [res] = await db.select().from(invoices).where(eq(invoices.id, id));
    return res;
  }
  async createInvoice(inv: InsertInvoice) {
    const [info] = await db.insert(invoices).values(inv);
    const [res] = await db.select().from(invoices).where(eq(invoices.id, info.insertId));
    return res;
  }
  async updateInvoice(id: number, data: Partial<Invoice>) {
    await db.update(invoices).set(data as any).where(eq(invoices.id, id));
    const [res] = await db.select().from(invoices).where(eq(invoices.id, id));
    return res;
  }

  async getPaymentLogsByInvoice(invoiceId: number) {
    return await db.select().from(paymentLogs).where(eq(paymentLogs.invoiceId, invoiceId));
  }
  async createPaymentLog(log: InsertPaymentLog) {
    const [info] = await db.insert(paymentLogs).values(log);
    const [res] = await db.select().from(paymentLogs).where(eq(paymentLogs.id, info.insertId));
    return res;
  }

  // ── Files
  async getFilesByProject(projectId: number) {
    return await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId));
  }
  async createFile(f: InsertProjectFile) {
    const [info] = await db.insert(projectFiles).values(f);
    const [res] = await db.select().from(projectFiles).where(eq(projectFiles.id, info.insertId));
    return res;
  }
  async getFileById(id: number) {
    const [res] = await db.select().from(projectFiles).where(eq(projectFiles.id, id));
    return res;
  }
  async deleteFile(id: number) {
    await db.delete(projectFiles).where(eq(projectFiles.id, id));
  }

  // ── Update Requests
  async getUpdateRequests(projectId?: number, userId?: number) {
    if (projectId && userId) {
      return await db.select().from(updateRequests).where(and(eq(updateRequests.projectId, projectId), eq(updateRequests.userId, userId)));
    }
    if (projectId) return await db.select().from(updateRequests).where(eq(updateRequests.projectId, projectId));
    if (userId) return await db.select().from(updateRequests).where(eq(updateRequests.userId, userId));
    return await db.select().from(updateRequests);
  }
  async createUpdateRequest(r: InsertUpdateRequest) {
    const [info] = await db.insert(updateRequests).values(r);
    const [res] = await db.select().from(updateRequests).where(eq(updateRequests.id, info.insertId));
    return res;
  }
  async replyToUpdateRequest(id: number, reply: string) {
    await db.update(updateRequests).set({ adminReply: reply, status: "replied" }).where(eq(updateRequests.id, id));
    const [res] = await db.select().from(updateRequests).where(eq(updateRequests.id, id));
    return res;
  }

  // ── WhatsApp Leads
  async getWhatsappLeads() { return await db.select().from(whatsappLeads); }
  async getWhatsappLeadById(id: number) {
    const [res] = await db.select().from(whatsappLeads).where(eq(whatsappLeads.id, id));
    return res;
  }
  async createWhatsappLead(l: InsertWhatsappLead) {
    const [info] = await db.insert(whatsappLeads).values(l);
    const [res] = await db.select().from(whatsappLeads).where(eq(whatsappLeads.id, info.insertId));
    return res;
  }
  async updateWhatsappLeadStatus(id: number, status: string) {
    await db.update(whatsappLeads).set({ status }).where(eq(whatsappLeads.id, id));
    const [res] = await db.select().from(whatsappLeads).where(eq(whatsappLeads.id, id));
    return res;
  }

  // ── Analytics
  async getAnalytics() {
    const allClients = await db.select().from(users).where(eq(users.role, "client"));
    const allProjects = await db.select().from(projects);
    const allInvoices = await db.select().from(invoices);
    const allQuotes = await db.select().from(quotes);
    const allMessages = await db.select().from(contactMessages);

    const totalRevenue = allInvoices.filter(i => i.status === "paid").reduce((sum, i) => sum + i.amount, 0);
    return {
      totalClients: allClients.length,
      totalProjects: allProjects.length,
      activeProjects: allProjects.filter(p => p.status === "active").length,
      totalRevenue,
      pendingQuotes: allQuotes.filter(q => q.status === "pending").length,
      unreadMessages: allMessages.filter(m => !m.read).length,
      monthlyData: [],
    };
  }

  // ── Messaging (Refactored)
  async getConversationByProjectId(projectId: number): Promise<Conversation> {
    const [existing] = await db.select().from(conversations).where(eq(conversations.projectId, projectId));
    if (existing) return existing;

    const [info] = await db.insert(conversations).values({ projectId });
    const [created] = await db.select().from(conversations).where(eq(conversations.id, info.insertId));
    return created;
  }

  async createMessage(m: InsertMessage): Promise<Message> {
    const [info] = await db.insert(messages).values(m);
    const [res] = await db.select().from(messages).where(eq(messages.id, info.insertId));
    return res;
  }

  async getMessagesByConversationId(conversationId: number): Promise<(Message & { attachments: Attachment[] })[]> {
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, conversationId));
    const result = [];
    for (const m of msgs) {
      const atts = await db.select().from(attachments).where(eq(attachments.messageId, m.id));
      result.push({ ...m, attachments: atts });
    }
    return result;
  }

  async createAttachment(a: InsertAttachment): Promise<Attachment> {
    const [info] = await db.insert(attachments).values(a);
    const [res] = await db.select().from(attachments).where(eq(attachments.id, info.insertId));
    return res;
  }

  // ── Migration Logic
  async updateConversationStatus(id: number, data: { adminLastReadAt?: Date; clientLastReadAt?: Date }) {
    await db.update(conversations).set(data).where(eq(conversations.id, id));
  }

  async migrateCommentsToMessages() {
    const comments = await db.select().from(projectComments);
    if (comments.length === 0) return;

    for (const c of comments) {
      if (!c.projectId) continue;
      const conv = await this.getConversationByProjectId(c.projectId);

      // Check if message already exists (simple check by content + time)
      const [existing] = await db.select().from(messages).where(and(
        eq(messages.conversationId, conv.id),
        eq(messages.content, c.content || ""),
        eq(messages.senderId, c.userId || 0)
      ));

      if (!existing) {
        await this.createMessage({
          conversationId: conv.id,
          senderRole: c.userId === 1 ? "admin" : "client",
          senderId: c.userId || 1,
          content: c.content
        });
      }
    }
  }
}

// Always use DatabaseStorage — SQLite is always available
export const storage: IStorage = new DatabaseStorage();

