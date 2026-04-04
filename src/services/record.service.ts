import { supabase } from "../lib/supabase.js";
import type { RecordStatus, RecordType } from "../types/domain.js";
import { ApiError } from "../utils/api-error.js";
import { logAudit } from "./audit.service.js";

const RECORD_SELECT =
  "id,amount,type,category,entry_date,notes,status,reversal_of,created_by,updated_by,is_deleted,deleted_at,deleted_by,reverted_at,reverted_by,revert_reason,created_at,updated_at";

type RawFinancialRecord = {
  id: string;
  amount: string | number;
  type: RecordType;
  category: string;
  entry_date: string;
  notes: string | null;
  status: RecordStatus;
  reversal_of: string | null;
  created_by: string;
  updated_by: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  reverted_at: string | null;
  reverted_by: string | null;
  revert_reason: string | null;
  created_at: string;
  updated_at: string;
};

type CreateRecordInput = {
  amount: number;
  type: RecordType;
  category: string;
  entryDate: string;
  notes?: string;
};

type UpdateRecordInput = Partial<CreateRecordInput>;

export type ListRecordsInput = {
  page: number;
  limit: number;
  type?: RecordType;
  category?: string;
  status?: RecordStatus;
  dateFrom?: string;
  dateTo?: string;
  includeDeleted?: boolean;
};

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function normalizeRecord(record: RawFinancialRecord) {
  return {
    id: record.id,
    amount: toNumber(record.amount),
    type: record.type,
    category: record.category,
    entryDate: record.entry_date,
    notes: record.notes,
    status: record.status,
    reversalOf: record.reversal_of,
    createdBy: record.created_by,
    updatedBy: record.updated_by,
    isDeleted: record.is_deleted,
    deletedAt: record.deleted_at,
    deletedBy: record.deleted_by,
    revertedAt: record.reverted_at,
    revertedBy: record.reverted_by,
    revertReason: record.revert_reason,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

async function getRawRecordById(recordId: string): Promise<RawFinancialRecord | null> {
  const { data, error } = await supabase
    .from("financial_records")
    .select(RECORD_SELECT)
    .eq("id", recordId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "Failed to fetch record", "RECORD_FETCH_FAILED", error.message);
  }

  return (data as RawFinancialRecord | null) ?? null;
}

export async function createRecord(input: CreateRecordInput, actorId: string) {
  const { data, error } = await supabase
    .from("financial_records")
    .insert({
      amount: input.amount,
      type: input.type,
      category: input.category,
      entry_date: input.entryDate,
      notes: input.notes ?? null,
      created_by: actorId,
      updated_by: actorId,
      status: "active"
    })
    .select(RECORD_SELECT)
    .single();

  if (error || !data) {
    throw new ApiError(500, "Failed to create record", "RECORD_CREATE_FAILED", error?.message);
  }

  await logAudit({
    action: "CREATE_RECORD",
    actorId,
    targetType: "record",
    targetId: data.id,
    details: {
      type: input.type,
      amount: input.amount,
      category: input.category
    }
  });

  return normalizeRecord(data as RawFinancialRecord);
}

export async function listRecords(input: ListRecordsInput) {
  let query = supabase.from("financial_records").select(RECORD_SELECT, { count: "exact" });

  if (!input.includeDeleted) {
    query = query.eq("is_deleted", false);
  }

  if (input.type) {
    query = query.eq("type", input.type);
  }

  if (input.status) {
    query = query.eq("status", input.status);
  }

  if (input.category) {
    query = query.ilike("category", `%${input.category}%`);
  }

  if (input.dateFrom) {
    query = query.gte("entry_date", input.dateFrom);
  }

  if (input.dateTo) {
    query = query.lte("entry_date", input.dateTo);
  }

  const from = (input.page - 1) * input.limit;
  const to = from + input.limit - 1;

  const { data, count, error } = await query
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new ApiError(500, "Failed to list records", "RECORD_LIST_FAILED", error.message);
  }

  const total = count ?? 0;
  const rows = (data ?? []) as RawFinancialRecord[];

  return {
    items: rows.map((record) => normalizeRecord(record)),
    meta: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / input.limit)
    }
  };
}

export async function getRecordById(recordId: string, includeDeleted = false) {
  const record = await getRawRecordById(recordId);

  if (!record) {
    throw new ApiError(404, "Record not found", "RECORD_NOT_FOUND");
  }

  if (!includeDeleted && record.is_deleted) {
    throw new ApiError(404, "Record not found", "RECORD_NOT_FOUND");
  }

  return normalizeRecord(record);
}

export async function updateRecord(recordId: string, input: UpdateRecordInput, actorId: string) {
  const existingRecord = await getRawRecordById(recordId);

  if (!existingRecord) {
    throw new ApiError(404, "Record not found", "RECORD_NOT_FOUND");
  }

  if (existingRecord.is_deleted) {
    throw new ApiError(409, "Cannot update a deleted record", "RECORD_DELETED");
  }

  if (existingRecord.status !== "active") {
    throw new ApiError(409, "Only active records can be updated", "RECORD_NOT_ACTIVE");
  }

  const updates: Record<string, unknown> = {
    updated_by: actorId
  };

  if (input.amount !== undefined) {
    updates.amount = input.amount;
  }

  if (input.type !== undefined) {
    updates.type = input.type;
  }

  if (input.category !== undefined) {
    updates.category = input.category;
  }

  if (input.entryDate !== undefined) {
    updates.entry_date = input.entryDate;
  }

  if (input.notes !== undefined) {
    updates.notes = input.notes;
  }

  if (Object.keys(updates).length === 1) {
    throw new ApiError(400, "No fields to update", "NO_UPDATE_FIELDS");
  }

  const { data, error } = await supabase
    .from("financial_records")
    .update(updates)
    .eq("id", recordId)
    .select(RECORD_SELECT)
    .single();

  if (error || !data) {
    throw new ApiError(500, "Failed to update record", "RECORD_UPDATE_FAILED", error?.message);
  }

  await logAudit({
    action: "UPDATE_RECORD",
    actorId,
    targetType: "record",
    targetId: recordId,
    details: {
      changedFields: Object.keys(updates).filter((field) => field !== "updated_by")
    }
  });

  return normalizeRecord(data as RawFinancialRecord);
}

export async function softDeleteRecord(recordId: string, actorId: string) {
  const existingRecord = await getRawRecordById(recordId);

  if (!existingRecord) {
    throw new ApiError(404, "Record not found", "RECORD_NOT_FOUND");
  }

  if (existingRecord.is_deleted) {
    throw new ApiError(409, "Record already deleted", "RECORD_ALREADY_DELETED");
  }

  if (existingRecord.status !== "active") {
    throw new ApiError(409, "Only active records can be deleted", "RECORD_NOT_ACTIVE");
  }

  const { data, error } = await supabase
    .from("financial_records")
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: actorId,
      updated_by: actorId
    })
    .eq("id", recordId)
    .select(RECORD_SELECT)
    .single();

  if (error || !data) {
    throw new ApiError(500, "Failed to delete record", "RECORD_DELETE_FAILED", error?.message);
  }

  await logAudit({
    action: "DELETE_RECORD",
    actorId,
    targetType: "record",
    targetId: recordId
  });

  return normalizeRecord(data as RawFinancialRecord);
}

function mapRevertRpcError(message: string): ApiError {
  if (message.includes("record_not_found")) {
    return new ApiError(404, "Record not found", "RECORD_NOT_FOUND");
  }

  if (message.includes("record_deleted")) {
    return new ApiError(409, "Cannot revert a deleted record", "RECORD_DELETED");
  }

  if (message.includes("record_not_active")) {
    return new ApiError(409, "Only active records can be reverted", "RECORD_NOT_ACTIVE");
  }

  if (message.includes("already_reverted")) {
    return new ApiError(409, "Record has already been reverted", "RECORD_ALREADY_REVERTED");
  }

  return new ApiError(500, "Failed to revert record", "RECORD_REVERT_FAILED", message);
}

export async function revertRecord(recordId: string, actorId: string, reason?: string) {
  const { data, error } = await supabase.rpc("revert_financial_record", {
    p_record_id: recordId,
    p_actor_id: actorId,
    p_reason: reason ?? null
  });

  if (error || !data) {
    throw mapRevertRpcError(error?.message ?? "Unexpected revert error");
  }

  const reversalRecordId = String(data);
  const reversalRecord = await getRecordById(reversalRecordId, true);

  await logAudit({
    action: "REVERT_RECORD",
    actorId,
    targetType: "record",
    targetId: recordId,
    details: {
      reversalRecordId,
      reason: reason ?? null
    }
  });

  return {
    originalRecordId: recordId,
    reversalRecord
  };
}
