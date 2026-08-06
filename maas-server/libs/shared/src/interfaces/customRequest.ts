import { Request } from "express";
export interface CustomRequest extends Request {
  user:
    | {
        id: string;
        role: number;
        email: string;
        permissions: string[];
      }
    | undefined;
  student?: {
    studentId: string;
    regNo: string;
    email: string | null;
    role: number;
    permissions: string[];
  };
}
