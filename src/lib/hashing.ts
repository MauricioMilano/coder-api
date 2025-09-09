import crypto from 'crypto';

export function sha256(content: Buffer | string): string {
  return 'sha256:' + crypto.createHash('sha256').update(content).digest('hex');
}
