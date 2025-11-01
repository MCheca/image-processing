import { z } from 'zod';

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10)),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  TRUST_PROXY: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),

  // Database
  MONGODB_URI: z.string().default('mongodb://localhost:27017/image-processing'),

  // CORS
  CORS_ORIGIN: z.string().default('*'),
  CORS_CREDENTIALS: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),

  // Security - Rate Limiting
  RATE_LIMIT_MAX: z
    .string()
    .default('100')
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_WINDOW: z.string().default('15 minutes'),

  // Image Processing
  OUTPUT_DIR: z.string().default('./output'),
  MAX_IMAGE_SIZE: z
    .string()
    .default('10485760')
    .transform((val) => parseInt(val, 10)),
});

export type Config = z.infer<typeof envSchema>;

let configInstance: Config | null = null;

export const getConfig = (): Config => {
  if (!configInstance) {
    configInstance = envSchema.parse(process.env);
  }
  return configInstance;
};

export const config = getConfig();
