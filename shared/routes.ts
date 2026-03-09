import { z } from "zod";
import { insertContactMessageSchema, insertServiceSchema, insertQuoteSchema, insertProjectSchema, insertTaskSchema, insertMilestoneSchema, insertProjectCommentSchema, insertInvoiceSchema } from "./schema";

const ServiceSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  basePrice: z.number().nullable(),
});

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  company: z.string().nullable(),
  phone: z.string().nullable(),
  createdAt: z.string().or(z.date()).nullable(),
});

const ProjectSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  clientId: z.number().nullable(),
  serviceId: z.number().nullable(),
  deadline: z.string().or(z.date()).nullable(),
  budget: z.number().nullable(),
  progress: z.number().nullable(),
  createdAt: z.string().or(z.date()).nullable(),
  updatedAt: z.string().or(z.date()).nullable(),
});

const TaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  projectId: z.number().nullable(),
  assignedTo: z.number().nullable(),
  status: z.string(),
  priority: z.string(),
  deadline: z.string().or(z.date()).nullable(),
  createdAt: z.string().or(z.date()).nullable(),
});

const MilestoneSchema = z.object({
  id: z.number(),
  title: z.string(),
  projectId: z.number().nullable(),
  dueDate: z.string().or(z.date()).nullable(),
  completed: z.boolean().nullable(),
  createdAt: z.string().or(z.date()).nullable(),
});

const QuoteSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  serviceIds: z.string(),
  projectDetails: z.string(),
  budget: z.string().nullable(),
  timeline: z.string().nullable(),
  status: z.string(),
  estimatedPrice: z.number().nullable(),
  createdAt: z.string().or(z.date()).nullable(),
});

const ContactMessageSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  message: z.string(),
  read: z.boolean().nullable(),
  createdAt: z.string().or(z.date()).nullable(),
});

const InvoiceSchema = z.object({
  id: z.number(),
  projectId: z.number().nullable(),
  clientId: z.number().nullable(),
  amount: z.number(),
  status: z.string(),
  dueDate: z.string().or(z.date()).nullable(),
  paidAt: z.string().or(z.date()).nullable(),
  createdAt: z.string().or(z.date()).nullable(),
});

const CommentSchema = z.object({
  id: z.number(),
  projectId: z.number().nullable(),
  userId: z.number().nullable(),
  content: z.string(),
  createdAt: z.string().or(z.date()).nullable(),
});

const AnalyticsSchema = z.object({
  totalClients: z.number(),
  totalProjects: z.number(),
  activeProjects: z.number(),
  totalRevenue: z.number(),
  pendingQuotes: z.number(),
  unreadMessages: z.number(),
  monthlyData: z.array(z.object({
    month: z.string(),
    inquiries: z.number(),
    projects: z.number(),
    revenue: z.number(),
  })),
});

export const api = {
  // ─── Public ──────────────────────────────────────────
  services: {
    list: {
      path: "/api/services",
      responses: { 200: z.array(ServiceSchema) },
    },
  },
  contactMessages: {
    create: {
      path: "/api/contact",
      input: insertContactMessageSchema,
      responses: { 201: ContactMessageSchema },
    },
  },
  quotes: {
    create: {
      path: "/api/quotes",
      input: insertQuoteSchema,
      responses: { 201: QuoteSchema },
    },
  },

  // ─── Auth ─────────────────────────────────────────────
  auth: {
    login: { path: "/api/auth/login" },
    logout: { path: "/api/auth/logout" },
    me: { path: "/api/auth/me" },
  },

  // ─── Admin ────────────────────────────────────────────
  admin: {
    services: {
      list: { path: "/api/admin/services" },
      create: { path: "/api/admin/services", input: insertServiceSchema },
      update: { path: "/api/admin/services/:id" },
      delete: { path: "/api/admin/services/:id" },
    },
    customers: {
      list: { path: "/api/admin/customers" },
      create: { path: "/api/admin/customers" },
    },
    projects: {
      list: { path: "/api/admin/projects" },
      create: { path: "/api/admin/projects", input: insertProjectSchema },
      update: { path: "/api/admin/projects/:id" },
      delete: { path: "/api/admin/projects/:id" },
    },
    tasks: {
      list: { path: "/api/admin/tasks" },
      create: { path: "/api/admin/tasks", input: insertTaskSchema },
      update: { path: "/api/admin/tasks/:id" },
    },
    milestones: {
      list: { path: "/api/admin/milestones" },
      create: { path: "/api/admin/milestones", input: insertMilestoneSchema },
      update: { path: "/api/admin/milestones/:id" },
    },
    quotes: {
      list: { path: "/api/admin/quotes" },
      update: { path: "/api/admin/quotes/:id" },
    },
    messages: {
      list: { path: "/api/admin/messages" },
      markRead: { path: "/api/admin/messages/:id/read" },
    },
    invoices: {
      list: { path: "/api/admin/invoices" },
      create: { path: "/api/admin/invoices", input: insertInvoiceSchema },
      update: { path: "/api/admin/invoices/:id" },
    },
    analytics: { path: "/api/admin/analytics" },
    comments: {
      list: { path: "/api/admin/comments" },
      create: { path: "/api/admin/comments", input: insertProjectCommentSchema },
    },
  },

  // ─── Client Portal ────────────────────────────────────
  portal: {
    projects: { path: "/api/portal/projects" },
    invoices: { path: "/api/portal/invoices" },
    comments: {
      list: { path: "/api/portal/comments" },
      create: { path: "/api/portal/comments" },
    },
  },
};
