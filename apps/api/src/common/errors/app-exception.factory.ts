import type { AppErrorCode } from "./app-error-code";
import {
  AppBadGatewayException,
  AppBadRequestException,
  AppConflictException,
  AppForbiddenException,
  AppInternalServerErrorException,
  AppNotFoundException,
  AppServiceUnavailableException,
  AppTooManyRequestsException,
  AppUnauthorizedException,
} from "./app-exception";

export const AppErrors = {
  badRequest(code: AppErrorCode, message: string | object): AppBadRequestException {
    return new AppBadRequestException(code, message);
  },

  unauthorized(code: AppErrorCode, message: string | object): AppUnauthorizedException {
    return new AppUnauthorizedException(code, message);
  },

  forbidden(code: AppErrorCode, message: string | object): AppForbiddenException {
    return new AppForbiddenException(code, message);
  },

  notFound(code: AppErrorCode, message: string | object): AppNotFoundException {
    return new AppNotFoundException(code, message);
  },

  conflict(code: AppErrorCode, message: string | object): AppConflictException {
    return new AppConflictException(code, message);
  },

  internal(code: AppErrorCode, message: string | object): AppInternalServerErrorException {
    return new AppInternalServerErrorException(code, message);
  },

  serviceUnavailable(
    code: AppErrorCode,
    message: string | object
  ): AppServiceUnavailableException {
    return new AppServiceUnavailableException(code, message);
  },

  badGateway(code: AppErrorCode, message: string | object): AppBadGatewayException {
    return new AppBadGatewayException(code, message);
  },

  tooManyRequests(code: AppErrorCode, message: string | object): AppTooManyRequestsException {
    return new AppTooManyRequestsException(code, message);
  },
};
