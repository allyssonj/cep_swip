import { drizzle } from "drizzle-orm/postgres-js"
import postgres from 'postgres'
import { env } from '@/config/env'
import { schema } from './schema'

const client = postgres(env.DATABASE_URL, {
    max: 10,
    idle_timeout: 30,
});

export const db = drizzle(client, {
    schema,
    casing: 'snake_case',
})