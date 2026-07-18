import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Archived Cloudflare schema reference. Production Nexcus runs on Node/PostgreSQL
// and the production client imports db/schema.ts instead.
export const surveys = sqliteTable("surveys", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default-workspace"),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  channel: text("channel").notNull().default("link"),
  status: text("status").notNull().default("draft"),
  audience: text("audience").notNull().default("All users"),
  trigger: text("trigger").notNull().default("Manual link share"),
  completion: text("completion").notNull().default("Thanks for the feedback."),
  questionsJson: text("questions_json").notNull().default("[]"),
  hiddenFieldsJson: text("hidden_fields_json").notNull().default("{}"),
  stylingJson: text("styling_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const respondents = sqliteTable("respondents", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default-workspace"),
  email: text("email").notNull().default(""),
  name: text("name").notNull().default("Anonymous"),
  attributesJson: text("attributes_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const responses = sqliteTable("responses", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default-workspace"),
  surveyId: text("survey_id").notNull().references(() => surveys.id),
  respondentId: text("respondent_id").notNull().references(() => respondents.id),
  status: text("status").notNull().default("completed"),
  score: integer("score"),
  answersJson: text("answers_json").notNull().default("{}"),
  hiddenFieldsJson: text("hidden_fields_json").notNull().default("{}"),
  tagsJson: text("tags_json").notNull().default("[]"),
  source: text("source").notNull().default("api"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const integrationEvents = sqliteTable("integration_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default-workspace"),
  integration: text("integration").notNull(),
  eventType: text("event_type").notNull(),
  status: text("status").notNull().default("prepared"),
  payloadJson: text("payload_json").notNull().default("{}"),
  responseId: text("response_id"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const sdkEvents = sqliteTable("sdk_events", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default-workspace"),
  eventType: text("event_type").notNull(),
  environmentId: text("environment_id").notNull().default(""),
  userId: text("user_id").notNull().default(""),
  payloadJson: text("payload_json").notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().default("default-workspace"),
  action: text("action").notNull(),
  actor: text("actor").notNull().default("system"),
  detail: text("detail").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
