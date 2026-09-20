import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { structuredLog } from './observability';

@Catch()
export class SafeApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { requestId?: string }>();
    const response = http.getResponse<Response>();
    const requestId = request.requestId;
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error.';
    let code = 'INTERNAL_ERROR';
    const parserError = exception as { status?: unknown; type?: unknown };
    if (parserError?.type === 'entity.too.large' || parserError?.status === 413) {
      status = HttpStatus.PAYLOAD_TOO_LARGE;
      message = 'Request payload is too large.';
      code = 'PAYLOAD_TOO_LARGE';
    } else if (parserError?.type === 'entity.parse.failed') {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid JSON payload.';
      code = 'VALIDATION_ERROR';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') message = payload;
      else if (payload && typeof payload === 'object' && 'message' in payload) {
        const raw = (payload as { message?: unknown }).message;
        message = Array.isArray(raw) ? 'Invalid request.' : typeof raw === 'string' ? raw : message;
      }
      if (
        status === HttpStatus.BAD_REQUEST &&
        /json|unexpected token|unexpected end/i.test(message)
      ) {
        message = 'Invalid JSON payload.';
      }
      code =
        status === 400
          ? 'VALIDATION_ERROR'
          : status === 401
            ? 'UNAUTHORIZED'
            : status === 403
              ? 'FORBIDDEN'
              : status === 404
                ? 'NOT_FOUND'
                : status === 429
                  ? 'RATE_LIMITED'
                  : code;
    } else {
      structuredLog('error', 'api.unhandled_error', {
        requestId,
        method: request.method,
        path: request.path,
      });
    }
    const body: Record<string, unknown> = { statusCode: status, message, code };
    if (requestId) body.requestId = requestId;
    response.status(status).json(body);
  }
}
