import { pgTable, text, timestamp, index, varchar } from "drizzle-orm/pg-core";
import { randomUUIDv7 } from "bun";

export const cep = pgTable(
  "cep",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUIDv7()),
    cep: varchar("cep", { length: 8 }).notNull(),
    logradouro: varchar("logradouro", { length: 255 }).notNull(),
    complemento: text("complemento").notNull(),
    bairro: varchar("bairro", { length: 255 }).notNull(),
    localidade: varchar("localidade", { length: 255 }).notNull(),
    uf: varchar("uf", { length: 2 }).notNull(),
    ibge: varchar("ibge", { length: 7 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("cep_idx").on(table.cep),
  ]
);
