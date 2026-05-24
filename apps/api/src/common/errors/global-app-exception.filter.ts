import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AppErrorCode } from "./app-error-code";
import { hasAppCode } from "./app-exception";
import type { ErrorResponseDto } from "./error-response.dto";

function resolveMessage(exception: HttpException): string | string[] {
  const response = exception.getResponse();

  if (typeof response === "string") {
    return response;
  }

  if (typeof response === "object" && response !== null && "message" in response) {
    const message = (response as { message?: string | string[] }).message;

    if (typeof message === "string" || Array.isArray(message)) {
      return message;
    }
  }

  return exception.message;
}

function resolveCode(exception: unknown, statusCode: number): AppErrorCode {
  if (hasAppCode(exception)) {
    return exception.appCode;
  }

  if (statusCode === HttpStatus.BAD_REQUEST) {
    return AppErrorCode.VALIDATION_FAILED;
  }

  if (statusCode === HttpStatus.UNAUTHORIZED) {
    return AppErrorCode.UNAUTHORIZED;
  }

  if (statusCode === HttpStatus.FORBIDDEN) {
    return AppErrorCode.FORBIDDEN;
  }

  if (statusCode >= 500) {
    return AppErrorCode.INTERNAL_ERROR;
  }

  return AppErrorCode.HTTP_ERROR;
}

@Catch()
export class GlobalAppExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const body: ErrorResponseDto = {
        success: false,
        code: resolveCode(exception, statusCode),
        message: resolveMessage(exception),
        statusCode,
        timestamp: new Date().toISOString(),
        path: request.url,
      };

      response.status(statusCode).json(body);
      return;
    }

    const body: ErrorResponseDto = {
      success: false,
      code: AppErrorCode.INTERNAL_ERROR,
      message: "Internal server error.",
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body);
  }
}
