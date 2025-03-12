import type { Config } from "drizzle-kit";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

export default {
  schema: "./schema/*",
  out: "./supabase/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: `postgresql://postgres.urgmbhtxmdsfqplqybon:${process.env.DATABASE_PASSWORD}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres`
  }
} satisfies Config;
