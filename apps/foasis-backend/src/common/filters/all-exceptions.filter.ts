import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

const GENERIC_INTERNAL = 'Something went wrong. Please try again.';

/**
 * Maps all unhandled errors to safe HTTP responses.
 * Never returns stack traces or raw Prisma internals to clients.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        response.status(status).json({
          statusCode: status,
          message: exceptionResponse,
          error: HttpStatus[status] ?? 'Error',
        });
        return;
      }

      const body = exceptionResponse as Record<string, unknown>;
      const message = body.message ?? exception.message;

      response.status(status).json({
        statusCode: status,
        message,
        error:
          typeof body.error === 'string'
            ? body.error
            : (HttpStatus[status] ?? 'Error'),
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = this.mapPrismaError(exception);
      this.logger.warn(
        `Prisma ${exception.code}: ${mapped.message}`,
        exception.meta ? JSON.stringify(exception.meta) : undefined,
      );
      response.status(mapped.status).json({
        statusCode: mapped.status,
        message: mapped.message,
        error: HttpStatus[mapped.status] ?? 'Error',
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.warn(`Prisma validation error: ${exception.message}`);
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid request data',
        error: 'Bad Request',
      });
      return;
    }

    const message =
      exception instanceof Error ? exception.message : String(exception);

    // Known internal guard strings → stable client-facing codes
    if (message === 'Cross-workspace write blocked') {
      response.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'You cannot modify data outside your workspace',
        error: 'Forbidden',
      });
      return;
    }

    if (message === 'Workspace context missing') {
      this.logger.error('Workspace context missing on request path');
      response.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        message: 'Workspace context is required',
        error: 'Forbidden',
      });
      return;
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : message,
    );

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: GENERIC_INTERNAL,
      error: 'Internal Server Error',
    });
  }

  private mapPrismaError(error: Prisma.PrismaClientKnownRequestError): {
    status: number;
    message: string;
  } {
    switch (error.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          message: 'A record with these details already exists',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Resource not found',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Related record not found or invalid reference',
        };
      case 'P2014':
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid relation for this operation',
        };
      default:
        this.logger.error(
          `Unhandled Prisma code ${error.code}`,
          error.message,
        );
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: GENERIC_INTERNAL,
        };
    }
  }
}
