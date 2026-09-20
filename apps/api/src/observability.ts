import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const counters = new Map<string, number>();
const durations = new Map<string, { count: number; totalMs: number }>();

export function requestIdMiddleware(
  req: Request & { requestId?: string },
  res: Response,
  next: NextFunction,
) {
  const incoming = req.header('x-request-id');
  const requestId = incoming && requestIdPattern.test(incoming) ? incoming : randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  const started = process.hrtime.bigint();
  res.on('finish', () => {
    const route = req.route?.path ? `${req.method} ${req.route.path}` : `${req.method} ${req.path}`;
    increment('http_requests_total');
    if (res.statusCode >= 400) increment('http_errors_total');
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1_000_000;
    const current = durations.get(route) ?? { count: 0, totalMs: 0 };
    durations.set(route, { count: current.count + 1, totalMs: current.totalMs + elapsedMs });
    structuredLog('info', 'http.request', {
      requestId,
      method: req.method,
      route,
      status: res.statusCode,
      durationMs: Math.round(elapsedMs * 100) / 100,
    });
  });
  next();
}

export function increment(name: string, amount = 1) {
  counters.set(name, (counters.get(name) ?? 0) + amount);
}

export function metricsSnapshot() {
  return {
    counters: Object.fromEntries(counters),
    durations: Object.fromEntries(
      [...durations].map(([route, value]) => [
        route,
        { ...value, averageMs: value.count ? value.totalMs / value.count : 0 },
      ]),
    ),
  };
}

export function structuredLog(
  level: 'info' | 'warn' | 'error',
  event: string,
  fields: Record<string, unknown> = {},
) {
  const safe = Object.fromEntries(
    Object.entries(fields).filter(
      ([key]) => !/(password|token|secret|cookie|authorization|hash)/i.test(key),
    ),
  );
  process.stdout.write(
    `${JSON.stringify({ level, event, timestamp: new Date().toISOString(), ...safe })}\n`,
  );
}
