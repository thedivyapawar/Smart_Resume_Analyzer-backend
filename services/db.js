// Connect to PostgreSQL using pg Pool
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// PostgreSQL connection pool
export const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Supabase remote connections
  },
});
