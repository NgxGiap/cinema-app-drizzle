import type { Config } from 'drizzle-kit';
import 'dotenv/config';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DB_HOST ?? 'localhost',
    port: +(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'root',
    database: process.env.DB_NAME ?? 'cinema_app',
  },
  strict: true,
  verbose: true,
} satisfies Config;
