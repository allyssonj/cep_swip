import { db } from "@/database/client";
import { cep as cepTable } from "@/database/schema/cep";
import { eq } from "drizzle-orm";
import type { CepData } from "./cep.types";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function findByCep(cepValue: string) {
  const result = await db
    .select()
    .from(cepTable)
    .where(eq(cepTable.cep, cepValue))
    .limit(1);

  return result[0] ?? null;
}

export function isStale(updatedAt: Date): boolean {
  return Date.now() - updatedAt.getTime() > SEVEN_DAYS_MS;
}

export async function upsert(data: CepData) {
  const existing = await findByCep(data.cep);

  if (existing && !isStale(existing.updatedAt)) {
    return existing;
  }

  if (existing) {
    const [updated] = await db
      .update(cepTable)
      .set({
        logradouro: data.logradouro,
        complemento: data.complemento,
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf,
        ibge: data.ibge,
      })
      .where(eq(cepTable.cep, data.cep))
      .returning();

    return updated;
  }

  const [inserted] = await db
    .insert(cepTable)
    .values({
      cep: data.cep,
      logradouro: data.logradouro,
      complemento: data.complemento,
      bairro: data.bairro,
      localidade: data.localidade,
      uf: data.uf,
      ibge: data.ibge,
    })
    .returning();

  return inserted;
}
