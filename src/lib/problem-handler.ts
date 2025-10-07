import { Request, Response, NextFunction } from 'express';
import { ProblemJson } from '../types/common';

export function problemErrorHandler(error: any, request: Request, response: Response, next: NextFunction) {
  const status = (error.statusCode && typeof error.statusCode === 'number') ? error.statusCode : 500;
  const problem: ProblemJson = {
    type: 'about:blank',
    title: error.name || 'InternalError',
    status,
    detail: error.message,
    instance: request.url,
    extras: (error as any).extras,
  };
  response.status(status).type('application/problem+json').json(problem);
}
