import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ProblemJson } from '../types/common';

export function problemErrorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const status = (error.statusCode && typeof error.statusCode === 'number') ? error.statusCode : 500;
  const problem: ProblemJson = {
    type: 'about:blank',
    title: error.name || 'InternalError',
    status,
    detail: error.message,
    instance: request.url,
    extras: (error as any).extras,
  };
  reply.status(status).type('application/problem+json').send(problem);
}
