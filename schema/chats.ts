import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { products } from "./products";

export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  sessionType: text("session_type").notNull(), // 'analysis', 'marketing_angle', 'script_generation'
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => chatSessions.id),
  role: text("role").notNull(), // 'user', 'assistant', 'system'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // Store vector chunks, LLM settings, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const marketingAngles = pgTable("marketing_angles", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  chatMessageId: uuid("chat_message_id").notNull().references(() => chatMessages.id),
  angle: text("angle").notNull(),
  status: text("status").notNull().default('draft'), // 'draft', 'selected', 'archived'
  createdAt: timestamp("created_at").defaultNow(),
});

export const adScripts = pgTable("ad_scripts", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id),
  marketingAngleId: uuid("marketing_angle_id").notNull().references(() => marketingAngles.id),
  chatSessionId: uuid("chat_session_id").notNull().references(() => chatSessions.id),
  templateType: text("template_type").notNull(), // 'Hook', 'Problem', 'Solution', 'CTA'
  content: text("content").notNull(),
  version: text("version").notNull().default('1'),
  status: text("status").notNull().default('draft'), // 'draft', 'final', 'archived'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}); 