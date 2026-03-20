import { lookup, CepValidationError, CepNotFoundError } from "./cep.service";

export async function findCep(cep: string) {
  return await lookup(cep);
}

export { CepValidationError, CepNotFoundError };
