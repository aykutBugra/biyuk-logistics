import type { AppErrorCode } from "./app-error-code";

export type ErrorResponseDto = {
  success: false;
  code: AppErrorCode;
  message: string | string[];
  statusCode: number;
  timestamp: string;
  path: string;
};
