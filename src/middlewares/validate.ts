import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

type RequestSegment = "body" | "params" | "query";

export function validate(schema: ZodTypeAny, segment: RequestSegment = "body"): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.parse(req[segment]);

    const mutableRequest = req as unknown as {
      body: unknown;
      params: unknown;
      query: unknown;
    };

    mutableRequest[segment] = parsed;
    next();
  };
}
