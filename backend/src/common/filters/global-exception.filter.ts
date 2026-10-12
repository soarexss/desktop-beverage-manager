import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: "Internal server error" };

    const message =
      typeof errorResponse === "string"
        ? errorResponse
        : ((errorResponse as { message?: unknown }).message ??
          "Unexpected error");

    if (status >= 500) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${String(request.url).split("?")[0]}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    }

    response.status(status).json({
      success: false,
      timestamp: new Date().toISOString(),
      path: String(request.url).split("?")[0],
      error: {
        statusCode: status,
        message,
      },
    });
  }
}
