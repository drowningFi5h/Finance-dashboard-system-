import { supabase } from "../lib/supabase.js";

type AuditLogInput = {
  action: string;
  actorId: string | null;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown>;
};

export async function logAudit(input: AuditLogInput): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert({
    action: input.action,
    actor_id: input.actorId,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    details: input.details ?? {}
  });

  if (error) {
    console.error("Failed to write audit log", error.message);
  }
}
