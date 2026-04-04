import { hashPassword } from "../lib/password.js";
import { supabase } from "../lib/supabase.js";
import type { UserRole, UserStatus } from "../types/domain.js";
import { ApiError } from "../utils/api-error.js";
import { logAudit } from "./audit.service.js";
import { revokeAllSessionsForUser } from "./session.service.js";

type UserView = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
};

type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: UserStatus;
};

type UpdateUserInput = Partial<CreateUserInput>;

export async function listUsers(): Promise<UserView[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id,name,email,role,status,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new ApiError(500, "Failed to fetch users", "USER_LIST_FAILED", error.message);
  }

  return (data ?? []) as UserView[];
}

export async function createUser(input: CreateUserInput, actorId: string): Promise<UserView> {
  const normalizedEmail = input.email.toLowerCase().trim();

  const { data: existingUser, error: existingError } = await supabase
    .from("users")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingError) {
    throw new ApiError(500, "Failed to verify email", "USER_EMAIL_CHECK_FAILED", existingError.message);
  }

  if (existingUser) {
    throw new ApiError(409, "Email already exists", "EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);

  const { data, error } = await supabase
    .from("users")
    .insert({
      name: input.name,
      email: normalizedEmail,
      password_hash: passwordHash,
      role: input.role,
      status: input.status
    })
    .select("id,name,email,role,status,created_at,updated_at")
    .single();

  if (error || !data) {
    throw new ApiError(500, "Failed to create user", "USER_CREATE_FAILED", error?.message);
  }

  await logAudit({
    action: "CREATE_USER",
    actorId,
    targetType: "user",
    targetId: data.id,
    details: {
      email: normalizedEmail,
      role: input.role,
      status: input.status
    }
  });

  return data as UserView;
}

export async function updateUser(
  userId: string,
  input: UpdateUserInput,
  actorId: string
): Promise<UserView> {
  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) {
    updates.name = input.name;
  }

  if (input.email !== undefined) {
    updates.email = input.email.toLowerCase().trim();
  }

  if (input.role !== undefined) {
    updates.role = input.role;
  }

  if (input.status !== undefined) {
    updates.status = input.status;
  }

  if (input.password !== undefined) {
    updates.password_hash = await hashPassword(input.password);
  }

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No fields to update", "NO_UPDATE_FIELDS");
  }

  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select("id,name,email,role,status,created_at,updated_at")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      throw new ApiError(409, "Email already exists", "EMAIL_ALREADY_EXISTS");
    }

    throw new ApiError(500, "Failed to update user", "USER_UPDATE_FAILED", error.message);
  }

  if (!data) {
    throw new ApiError(404, "User not found", "USER_NOT_FOUND");
  }

  if (input.status === "inactive") {
    await revokeAllSessionsForUser(userId, "user_marked_inactive");
  }

  await logAudit({
    action: "UPDATE_USER",
    actorId,
    targetType: "user",
    targetId: userId,
    details: {
      changedFields: Object.keys(updates).filter((field) => field !== "password_hash"),
      role: input.role,
      status: input.status
    }
  });

  return data as UserView;
}
