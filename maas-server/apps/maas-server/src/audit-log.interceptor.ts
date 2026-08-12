import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bull";
import type { Queue } from "bull";
import { Observable, throwError } from "rxjs";
import { catchError, finalize, tap } from "rxjs/operators";
import { AuditLogPayload } from "@app/shared";
import { AUDIT_LOG_JOB, AUDIT_LOG_QUEUE } from "./audit-log.constants";

const SENSITIVE_KEY_PATTERN = /password|token|otp|secret/i;
const MAX_DATA_CHARS = 10_000;

const MODULE_BY_PATH: Array<{ pattern: RegExp; module: string }> = [
  {
    pattern:
      /^\/api\/(login|signup|verify-email|forgot-password|reset-password|resend-confirmation)/,
    module: "Auth",
  },
  { pattern: /^\/api\/trips/, module: "Trips" },
  { pattern: /^\/api\/admin/, module: "Admin" },
  { pattern: /^\/api\/details/, module: "Profile" },
];

export function resolveModule(path: string): string {
  for (const { pattern, module } of MODULE_BY_PATH) {
    if (pattern.test(path)) {
      return module;
    }
  }
  return "Other";
}

export function sanitizeLogData(value: any): any {
  if (value == null) {
    return value;
  }

  const cleaned = Array.isArray(value)
    ? value.map((item) => sanitizeLogData(item))
    : typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value).map(([key, val]) => [
            key,
            SENSITIVE_KEY_PATTERN.test(key)
              ? "[REDACTED]"
              : sanitizeLogData(val),
          ]),
        )
      : value;

  const json = JSON.stringify(cleaned);
  if (json.length > MAX_DATA_CHARS) {
    return JSON.parse(json.slice(0, MAX_DATA_CHARS));
  }
  return cleaned;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(
    @InjectQueue(AUDIT_LOG_QUEUE)
    private readonly auditQueue: Queue<AuditLogPayload>,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> | Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest<any>();
    const res = context.switchToHttp().getResponse<any>();
    const start = Date.now();

    if (this.shouldSkip(req)) {
      return next.handle();
    }

    const path = req.originalUrl?.split("?")[0] ?? req.url ?? "";
    const base = {
      user_id: req.user?.id,
      email: req.user?.email ?? req.body?.email,
      role: req.user?.role,
      ip_address: req.ip,
      user_agent: req.headers?.["user-agent"],
      method: req.method,
      path,
      module: resolveModule(path),
      action: `${req.method} ${path}`,
    };

    let successData: { status_code?: number; message?: string; data?: any } =
      {};
    let errorData: { status_code?: number; message?: string } = {};

    return next.handle().pipe(
      tap((value) => {
        successData = {
          status_code: res.statusCode,
          message: value?.message,
          data: value?.data,
        };
      }),
      catchError((err) => {
        errorData = {
          status_code: this.errorStatus(err),
          message: this.errorMessage(err),
        };
        return throwError(() => err);
      }),
      finalize(() => {
        const status_code =
          successData.status_code ?? errorData.status_code ?? res.statusCode;
        const status =
          status_code === 429
            ? "blocked"
            : status_code < 400
              ? "success"
              : "failed";

        const payload: AuditLogPayload = {
          ...base,
          status,
          status_code,
          duration_ms: Date.now() - start,
          message: successData.message ?? errorData.message,
          data:
            successData.status_code !== undefined
              ? sanitizeLogData(successData.data)
              : null,
        };

        this.auditQueue
          .add(AUDIT_LOG_JOB, payload, { removeOnComplete: true })
          .catch((e: Error) =>
            this.logger.error(`Audit enqueue failed: ${e.message}`),
          );
      }),
    );
  }

  private shouldSkip(req: any): boolean {
    const path = req.originalUrl?.split("?")[0] ?? req.url ?? "";
    if (req.method === "GET" && (path === "/" || path === "/api/")) {
      return true;
    }
    return /^\/(docs|docs-json)/.test(path);
  }

  private errorStatus(err: any): number {
    if (err instanceof HttpException) {
      return err.getStatus();
    }
    return 500;
  }

  private errorMessage(err: any): string {
    if (err instanceof HttpException) {
      const response = err.getResponse();
      if (typeof response === "string") {
        return response;
      }
      if (response && typeof response === "object") {
        const message = (response as any).message;
        if (Array.isArray(message)) {
          return message.join(", ");
        }
        if (typeof message === "string") {
          return message;
        }
      }
    }
    return err?.message ?? "Internal Server Error";
  }
}
