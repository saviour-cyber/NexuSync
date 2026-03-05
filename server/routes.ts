import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.services.list.path, async (req, res) => {
    const services = await storage.getServices();
    res.status(200).json(services);
  });

  app.post(api.contactMessages.create.path, async (req, res) => {
    try {
      const input = api.contactMessages.create.input.parse(req.body);
      const message = await storage.createContactMessage(input);
      res.status(201).json(message);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // Seed database
  const existingServices = await storage.getServices();
  if (existingServices.length === 0) {
    await storage.createService({
      title: "Graphic Design",
      description: "Creative and professional graphic designs tailored to your brand identity.",
      icon: "Palette"
    });
    await storage.createService({
      title: "Web Design",
      description: "Modern, responsive, and user-friendly websites built for performance.",
      icon: "Monitor"
    });
    await storage.createService({
      title: "E-Commerce Solutions",
      description: "Robust online stores designed to maximize conversions and sales.",
      icon: "ShoppingCart"
    });
    await storage.createService({
      title: "POS Designs",
      description: "Efficient Point of Sale systems to streamline your daily operations.",
      icon: "CreditCard"
    });
    await storage.createService({
      title: "Networking Services",
      description: "Reliable and secure networking solutions to keep your business connected.",
      icon: "Network"
    });
  }

  return httpServer;
}
