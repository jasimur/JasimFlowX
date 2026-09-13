import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const entries = sqliteTable("entries", {
  id: text("id").primaryKey(), owner: text("owner").notNull(), kind: text("kind").notNull(),
  amount: integer("amount").notNull(), category: text("category").notNull(), account: text("account").notNull(),
  to_account: text("to_account").notNull().default(""), person: text("person").notNull().default(""),
  parent_id: text("parent_id"), date: text("date").notNull(), due_date: text("due_date").notNull().default(""),
  note: text("note").notNull().default(""), channel: text("channel").notNull().default(""),
  created_at: text("created_at").notNull(), updated_at: text("updated_at").notNull(),
  deleted_at: text("deleted_at"), delete_group: text("delete_group"),
}, t => [index("idx_entries_owner_deleted_date").on(t.owner,t.deleted_at,t.date), index("idx_entries_owner_parent").on(t.owner,t.parent_id)]);
export const preferences = sqliteTable("preferences", {
  owner: text("owner").primaryKey(), data: text("data").notNull().default("{}"),
  bin_hash: text("bin_hash"), bin_salt: text("bin_salt"), failures: integer("failures").notNull().default(0),
  locked_until: integer("locked_until").notNull().default(0),
});
export const binSessions = sqliteTable("bin_sessions", {
  token_hash: text("token_hash").primaryKey(), owner: text("owner").notNull(), expires_at: integer("expires_at").notNull(),
}, t => [index("idx_bin_sessions_owner").on(t.owner)]);
export const syncReceipts = sqliteTable("sync_receipts", {
  operation_id: text("operation_id").primaryKey(), owner: text("owner").notNull(), payload_hash: text("payload_hash").notNull(), entry_updated_at: text("entry_updated_at").notNull().default(""),
  created_at: text("created_at").notNull(),
}, t => [index("idx_sync_receipts_owner").on(t.owner)]);
