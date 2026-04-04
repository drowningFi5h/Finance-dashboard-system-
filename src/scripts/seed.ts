import { hashPassword } from "../lib/password.js";
import { supabase } from "../lib/supabase.js";

const seedUsers = [
  {
    name: "Admin User",
    email: "admin@student.local",
    password: "admin123",
    role: "admin",
    status: "active"
  },
  {
    name: "Analyst User",
    email: "analyst@student.local",
    password: "analyst123",
    role: "analyst",
    status: "active"
  },
  {
    name: "Viewer User",
    email: "viewer@student.local",
    password: "viewer123",
    role: "viewer",
    status: "active"
  }
] as const;

async function run(): Promise<void> {
  console.log("Seeding demo users...");

  for (const user of seedUsers) {
    const passwordHash = await hashPassword(user.password);

    const { error } = await supabase.from("users").upsert(
      {
        name: user.name,
        email: user.email,
        password_hash: passwordHash,
        role: user.role,
        status: user.status
      },
      {
        onConflict: "email"
      }
    );

    if (error) {
      throw error;
    }

    console.log(`Upserted ${user.email}`);
  }

  console.log("Seed completed.");
  console.log("Credentials:");
  for (const user of seedUsers) {
    console.log(`- ${user.email} / ${user.password} (${user.role})`);
  }
}

run().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});
