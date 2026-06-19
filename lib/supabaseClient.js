import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  "https://vcqkumjrvugjugcwgubb.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjcWt1bWpydnVnanVnY3dndWJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Mjk2NzIsImV4cCI6MjA5NzAwNTY3Mn0.l4ut24bxiu2J_YufAzQXUcPRhi0aA0Qg2B6_Gtm_27w"
);
