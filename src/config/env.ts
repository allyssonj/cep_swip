import { z } from "zod";

const envSchema = z.object({
    APP_NAME: z.string(),
    APP_ENV: z.enum(["development", "production"]),
    APP_PORT: z.string(),

    DATABASE_URL: z.string(),

    APIKEY: z.string(),

    REDIS_HOST: z.string(),
    REDIS_PORT: z.string(),
    REDIS_PASSWORD: z.string(),
});

export const env = envSchema.parse(process.env);