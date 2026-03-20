import { redis } from "@/config/redis";
import type { CepData } from "./cep.types";
import * as repository from "./cep.repository";

const CACHE_PREFIX = "cep:";
const CACHE_TTL_SECONDS = 60 * 60 * 24;

function sanitizeCep(raw: string): string {
  return raw.replace(/\D/g, "");
}

function isValidCepFormat(cep: string): boolean {
  return /^\d{8}$/.test(cep);
}

function extractCepData(body: Record<string, unknown>): CepData | null {
  if (!body.cep || !body.logradouro || !body.localidade || !body.uf || !body.ibge) {
    return null;
  }

  return {
    cep: sanitizeCep(String(body.cep)),
    logradouro: String(body.logradouro),
    complemento: String(body.complemento ?? ""),
    bairro: String(body.bairro ?? ""),
    localidade: String(body.localidade),
    uf: String(body.uf),
    ibge: String(body.ibge),
  };
}

async function fetchFromOpenCep(cep: string): Promise<CepData | null> {
  try {
    const response = await fetch(`https://opencep.com/v1/${cep}`);
    if (response.status !== 200) return null;

    const body = await response.json();
    return extractCepData(body);
  } catch {
    return null;
  }
}

async function fetchFromViaCep(cep: string): Promise<CepData | null> {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (response.status !== 200) return null;

    const body = await response.json();
    if (body.erro) return null;

    return extractCepData(body);
  } catch {
    return null;
  }
}

async function getFromCache(cep: string): Promise<CepData | null> {
  try {
    const cached = await redis.get(`${CACHE_PREFIX}${cep}`);
    if (!cached) return null;
    return JSON.parse(cached) as CepData;
  } catch {
    return null;
  }
}

async function setCache(data: CepData): Promise<void> {
  try {
    await redis.set(
      `${CACHE_PREFIX}${data.cep}`,
      JSON.stringify(data),
      "EX",
      CACHE_TTL_SECONDS
    );
  } catch {
    // cache indisponível, segue sem cachear
  }
}

function dbRecordToCepData(record: {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
}): CepData {
  return {
    cep: record.cep,
    logradouro: record.logradouro,
    complemento: record.complemento,
    bairro: record.bairro,
    localidade: record.localidade,
    uf: record.uf,
    ibge: record.ibge,
  };
}

async function findInDatabase(cep: string) {
  try {
    return await repository.findByCep(cep);
  } catch {
    return null;
  }
}

async function saveToDatabase(data: CepData) {
  try {
    await repository.upsert(data);
  } catch {
    // banco indisponível, segue sem persistir
  }
}

export async function lookup(rawCep: string): Promise<CepData> {
  const cep = sanitizeCep(rawCep);

  if (!isValidCepFormat(cep)) {
    throw new CepValidationError("CEP deve conter exatamente 8 dígitos numéricos");
  }

  const cached = await getFromCache(cep);
  if (cached) {
    return cached;
  }

  const dbRecord = await findInDatabase(cep);
  if (dbRecord && !repository.isStale(dbRecord.updatedAt)) {
    const data = dbRecordToCepData(dbRecord);
    await setCache(data);
    return data;
  }

  const openCepData = await fetchFromOpenCep(cep);
  if (openCepData) {
    await Promise.all([saveToDatabase(openCepData), setCache(openCepData)]);
    return openCepData;
  }

  const viaCepData = await fetchFromViaCep(cep);
  if (viaCepData) {
    await Promise.all([saveToDatabase(viaCepData), setCache(viaCepData)]);
    return viaCepData;
  }

  if (dbRecord) {
    const staleData = dbRecordToCepData(dbRecord);
    await setCache(staleData);
    return staleData;
  }

  throw new CepNotFoundError("CEP não encontrado em nenhuma fonte de dados");
}

export class CepValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CepValidationError";
  }
}

export class CepNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CepNotFoundError";
  }
}
