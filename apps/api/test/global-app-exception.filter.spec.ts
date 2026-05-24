import { BadRequestException, HttpStatus } from "@nestjs/common";
import { AppErrorCode, AppErrors, GlobalAppExceptionFilter } from "../src/common/errors";

describe("GlobalAppExceptionFilter", () => {
  const filter = new GlobalAppExceptionFilter();

  function runFilter(exception: unknown) {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));

    filter.catch(exception, {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: "/api/v1/offers/1/accept" }),
      }),
    } as never);

    return { status, json };
  }

  it("maps AppException to standardized error response", () => {
    const { status, json } = runFilter(
      AppErrors.conflict(AppErrorCode.OFFER_CANNOT_ACCEPT, "Offer can no longer be accepted.")
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: AppErrorCode.OFFER_CANNOT_ACCEPT,
        message: "Offer can no longer be accepted.",
        statusCode: HttpStatus.CONFLICT,
        path: "/api/v1/offers/1/accept",
      })
    );
  });

  it("keeps validation message array for Nest BadRequestException", () => {
    const { json } = runFilter(
      new BadRequestException({
        message: ["field must be a string"],
        error: "Bad Request",
      })
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: AppErrorCode.VALIDATION_FAILED,
        message: ["field must be a string"],
      })
    );
  });
});
