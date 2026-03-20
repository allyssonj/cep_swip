import { Elysia } from "elysia";
import { z } from "zod";
import { findCep, CepValidationError, CepNotFoundError } from "./cep.controller";
import { apiKeyRateLimit } from "@/middleware/api-key-rate-limit";

const errorSchema = z.object({
  message: z.string(),
});

export const cepRoutes = new Elysia({ name: "cep" }).get(
  "/:cep",
  async ({ params, set }) => {
    try {
      return await findCep(params.cep);
    } catch (err) {
      if (err instanceof CepValidationError) {
        set.status = 400;
        return { message: err.message };
      }

      if (err instanceof CepNotFoundError) {
        set.status = 404;
        return { message: err.message };
      }

      set.status = 500;
      return { message: "Erro interno ao buscar CEP" };
    }
  },
  {
    beforeHandle: apiKeyRateLimit,
    detail: {
      summary: "Buscar endereço por CEP",
      description:
        "Consulta CEP via cache Redis, banco de dados, OpenCEP e ViaCEP com fallback automático",
      tags: ["cep"],
    },
    params: z.object({
      cep: z.string(),
    }),
    response: {
      200: z.object({
        cep: z.string(),
        logradouro: z.string(),
        complemento: z.string(),
        bairro: z.string(),
        localidade: z.string(),
        uf: z.string(),
        ibge: z.string(),
      }),
      400: errorSchema,
      404: errorSchema,
      429: errorSchema,
      500: errorSchema,
    },
  }
);
