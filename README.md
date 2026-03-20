# CEP SWIP API

API de consulta de CEP construída com **Bun + Elysia**, com estratégia de cache e fallback entre múltiplas fontes para reduzir latência e aumentar disponibilidade.

## O que é o sistema

O projeto expõe um endpoint HTTP para buscar endereço por CEP.
Quando uma requisição chega, o sistema tenta resolver o CEP nesta ordem:

1. **Redis (cache)**: resposta imediata quando já existe em memória.
2. **PostgreSQL (Drizzle ORM)**: usa dado persistido localmente.
3. **OpenCEP**: primeira fonte externa.
4. **ViaCEP**: fallback externo.
5. **Banco desatualizado**: se nada externo responder, retorna o último registro local disponível.

Se não houver dados em nenhuma fonte, a API retorna erro de CEP não encontrado.

## Como funciona (fluxo)

1. Cliente chama `GET /:cep`.
2. Middleware valida se existe `x-api-key` válido:
   - Com API key válida, a requisição passa sem limitação.
   - Sem API key válida, aplica rate limit por IP.
3. O serviço sanitiza o CEP (remove caracteres não numéricos) e valida o formato (`8 dígitos`).
4. Busca no Redis (`cep:<valor>`).
5. Se não encontrar, busca no banco:
   - Se o registro estiver dentro de 7 dias, retorna e recacheia.
6. Se estiver ausente ou desatualizado, consulta OpenCEP e depois ViaCEP.
7. Quando encontra dados externos válidos, persiste no banco e cacheia no Redis.
8. Retorna payload padronizado com os campos de endereço.

## Endpoint principal

### `GET /:cep`

Exemplo:

```bash
curl -X GET "http://localhost:3000/01001000" \
  -H "x-api-key: SUA_API_KEY"
```

Resposta de sucesso (`200`):

```json
{
  "cep": "01001000",
  "logradouro": "Praça da Sé",
  "complemento": "lado ímpar",
  "bairro": "Sé",
  "localidade": "São Paulo",
  "uf": "SP",
  "ibge": "3550308"
}
```

Possíveis erros:
- `400`: CEP inválido.
- `404`: CEP não encontrado.
- `429`: limite de requisições atingido (sem API key válida).
- `500`: erro interno.

## Variáveis de ambiente

Preencha o arquivo `.env` com base no `.env.example`:

```env
APP_NAME=
APP_ENV=development
APP_PORT=3000
DATABASE_URL=
APIKEY=
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
```

## Executando o projeto

Instalação de dependências:

```bash
bun install
```

Rodar em desenvolvimento:

```bash
bun run dev
```

Migrações:

```bash
bun run db:generate
bun run db:migrate
```