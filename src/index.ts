import { Elysia } from 'elysia'
import { env } from './config/env'
import { cepRoutes } from './module/cep/cep.routes'

export const app = new Elysia()
  .use(cepRoutes)
  .listen(env.APP_PORT)

console.log(`🚀 Server is running on http://localhost:${env.APP_PORT}`)