import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  InternalServerErrorException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import type { AppErrorCode } from "./app-error-code";

export class AppBadRequestException extends BadRequestException {
  readonly appCode: AppErrorCode;

  constructor(code: AppErrorCode, message: string | object) {
    super(message);
    this.appCode = code;
    this.name = "AppBadRequestException";
  }
}

export class AppUnauthorizedException extends UnauthorizedException {
  readonly appCode: AppErrorCode;

  constructor(code: AppErrorCode, message: string | object) {
    super(message);
    this.appCode = code;
    this.name = "AppUnauthorizedException";
  }
}

export class AppForbiddenException extends ForbiddenException {
  readonly appCode: AppErrorCode;

  constructor(code: AppErrorCode, message: string | object) {
    super(message);
    this.appCode = code;
    this.name = "AppForbiddenException";
  }
}

export class AppNotFoundException extends NotFoundException {
  readonly appCode: AppErrorCode;

  constructor(code: AppErrorCode, message: string | object) {
    super(message);
    this.appCode = code;
    this.name = "AppNotFoundException";
  }
}

export class AppConflictException extends ConflictException {
  readonly appCode: AppErrorCode;

  constructor(code: AppErrorCode, message: string | object) {
    super(message);
    this.appCode = code;
    this.name = "AppConflictException";
  }
}

export class AppInternalServerErrorException extends InternalServerErrorException {
  readonly appCode: AppErrorCode;

  constructor(code: AppErrorCode, message: string | object) {
    super(message);
    this.appCode = code;
    this.name = "AppInternalServerErrorException";
  }
}

export class AppServiceUnavailableException extends ServiceUnavailableException {
  readonly appCode: AppErrorCode;

  constructor(code: AppErrorCode, message: string | object) {
    super(message);
    this.appCode = code;
    this.name = "AppServiceUnavailableException";
  }
}

export class AppTooManyRequestsException extends HttpException {
  readonly appCode: AppErrorCode;

  constructor(code: AppErrorCode, message: string | object) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
    this.appCode = code;
    this.name = "AppTooManyRequestsException";
  }
}

export class AppBadGatewayException extends BadGatewayException {
  readonly appCode: AppErrorCode;

  constructor(code: AppErrorCode, message: string | object) {
    super(message);
    this.appCode = code;
    this.name = "AppBadGatewayException";
  }
}

export function hasAppCode(exception: unknown): exception is { appCode: AppErrorCode } {
  return (
    typeof exception === "object" &&
    exception !== null &&
    "appCode" in exception &&
    typeof (exception as { appCode: unknown }).appCode === "string"
  );
}
