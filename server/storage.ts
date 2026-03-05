import { db } from "./db";
import {
  services,
  contactMessages,
  type CreateServiceRequest,
  type CreateContactMessageRequest,
  type ServiceResponse,
  type ContactMessageResponse
} from "@shared/schema";

export interface IStorage {
  getServices(): Promise<ServiceResponse[]>;
  createService(service: CreateServiceRequest): Promise<ServiceResponse>;
  createContactMessage(message: CreateContactMessageRequest): Promise<ContactMessageResponse>;
}

export class DatabaseStorage implements IStorage {
  async getServices(): Promise<ServiceResponse[]> {
    return await db.select().from(services);
  }

  async createService(service: CreateServiceRequest): Promise<ServiceResponse> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async createContactMessage(message: CreateContactMessageRequest): Promise<ContactMessageResponse> {
    const [newMessage] = await db.insert(contactMessages).values(message).returning();
    return newMessage;
  }
}

export const storage = new DatabaseStorage();
