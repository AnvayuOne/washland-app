const fs = require("fs");
const path = require("path");

const envLocalPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envLocalPath)) {
  const envConfig = fs.readFileSync(envLocalPath, "utf8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const equalIdx = trimmed.indexOf("=");
      const key = trimmed.slice(0, equalIdx).trim();
      let val = trimmed.slice(equalIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://llhrfddkjwbyhljiafee.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsaHJmZGRrandieWhsamlhZmVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMjQ3ODQsImV4cCI6MjA3NjgwMDc4NH0.RRyRfXSNrnWHoZCDz75WOmg6-AZxh4HLLe9g6u6CMXw";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from("services").select("id, name, basePrice");
  console.log("Supabase query result:", { data, error });
}

test();
