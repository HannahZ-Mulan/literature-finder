import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  url: process.env.DATABASE_URL || 'file:./sqlite.db',
} satisfies Config;
