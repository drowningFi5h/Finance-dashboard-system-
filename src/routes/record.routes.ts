import { Router } from "express";

import { requireAuth } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/require-role.js";
import { validate } from "../middlewares/validate.js";
import { uuidParamSchema } from "../schemas/common.schema.js";
import {
  createRecordSchema,
  listRecordsQuerySchema,
  revertRecordSchema,
  updateRecordSchema
} from "../schemas/record.schema.js";
import {
  createRecord,
  getRecordById,
  listRecords,
  type ListRecordsInput,
  revertRecord,
  softDeleteRecord,
  updateRecord
} from "../services/record.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const recordRouter = Router();

recordRouter.use(requireAuth);

recordRouter.get(
  "/",
  requireRoles("analyst", "admin"),
  validate(listRecordsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const records = await listRecords(req.query as unknown as ListRecordsInput);

    res.status(200).json({
      success: true,
      data: records.items,
      meta: records.meta
    });
  })
);

recordRouter.post(
  "/",
  requireRoles("admin"),
  validate(createRecordSchema),
  asyncHandler(async (req, res) => {
    const record = await createRecord(req.body, req.auth!.user.id);

    res.status(201).json({
      success: true,
      message: "Record created",
      data: record
    });
  })
);

recordRouter.post(
  "/:id/revert",
  requireRoles("admin"),
  validate(uuidParamSchema, "params"),
  validate(revertRecordSchema),
  asyncHandler(async (req, res) => {
    const result = await revertRecord(req.params.id, req.auth!.user.id, req.body.reason);

    res.status(200).json({
      success: true,
      message: "Record reverted",
      data: result
    });
  })
);

recordRouter.get(
  "/:id",
  requireRoles("analyst", "admin"),
  validate(uuidParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const record = await getRecordById(req.params.id);

    res.status(200).json({
      success: true,
      data: record
    });
  })
);

recordRouter.patch(
  "/:id",
  requireRoles("admin"),
  validate(uuidParamSchema, "params"),
  validate(updateRecordSchema),
  asyncHandler(async (req, res) => {
    const record = await updateRecord(req.params.id, req.body, req.auth!.user.id);

    res.status(200).json({
      success: true,
      message: "Record updated",
      data: record
    });
  })
);

recordRouter.delete(
  "/:id",
  requireRoles("admin"),
  validate(uuidParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const record = await softDeleteRecord(req.params.id, req.auth!.user.id);

    res.status(200).json({
      success: true,
      message: "Record soft deleted",
      data: record
    });
  })
);
