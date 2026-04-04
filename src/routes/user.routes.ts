import { Router } from "express";

import { requireAuth } from "../middlewares/auth.js";
import { requireRoles } from "../middlewares/require-role.js";
import { validate } from "../middlewares/validate.js";
import { uuidParamSchema } from "../schemas/common.schema.js";
import { createUserSchema, updateUserSchema } from "../schemas/user.schema.js";
import { createUser, listUsers, updateUser } from "../services/user.service.js";
import { asyncHandler } from "../utils/async-handler.js";

export const userRouter = Router();

userRouter.use(requireAuth, requireRoles("admin"));

userRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await listUsers();

    res.status(200).json({
      success: true,
      data: users
    });
  })
);

userRouter.post(
  "/",
  validate(createUserSchema),
  asyncHandler(async (req, res) => {
    const user = await createUser(req.body, req.auth!.user.id);

    res.status(201).json({
      success: true,
      message: "User created",
      data: user
    });
  })
);

userRouter.patch(
  "/:id",
  validate(uuidParamSchema, "params"),
  validate(updateUserSchema),
  asyncHandler(async (req, res) => {
    const updatedUser = await updateUser(req.params.id, req.body, req.auth!.user.id);

    res.status(200).json({
      success: true,
      message: "User updated",
      data: updatedUser
    });
  })
);
