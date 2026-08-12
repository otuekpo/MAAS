export type AuditLogStatus = "success" | "failed" | "blocked";

export interface AuditLogPayload {
  user_id?: string;
  email?: string;
  action: string;
  module?: string;
  status: AuditLogStatus;
  ip_address?: string;
  method?: string;
  path?: string;
  status_code: number;
  duration_ms: number;
  user_agent?: string;
  role?: number;
  message?: string;
  data?: any;
}
