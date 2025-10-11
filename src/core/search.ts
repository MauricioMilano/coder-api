import fs from 'fs/promises';
import fss from 'fs';
import path from 'path';
import readline from 'readline';
import { safeResolvePath } from '../lib/fs-safe';

export interface SearchParams {
  path?: string;
  query: string;
  regex?: boolean;
  case_sensitive?: boolean;
  max_results?: number;
}

export async function searchInProject(project: { rootAbsPath: string }, params: SearchParams) {
  const { query } = params;
  if (!query || query.length === 0) {
    throw new Error('query is required');
  }
  const userPath = params.path ?? '/';
  const regex = params.regex ?? false;
  const case_sensitive = params.case_sensitive ?? false;
  const max_results = Math.max(1, Math.min(params.max_results ?? 200, 5000));

  const absRoot = project.rootAbsPath;
  const absPath = await safeResolvePath(absRoot, userPath);
  const results: Array<{ file: string; line: string; line_number: number; match: string }>= [];

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        // Heurística simples para binário: verifica byte nulo
        try {
          const buffer = await fs.readFile(fullPath);
          if (buffer.includes(0)) continue;
        } catch { continue; }

        try {
          const rl = readline.createInterface({
            input: fss.createReadStream(fullPath, { encoding: 'utf-8' }),
            crlfDelay: Infinity
          });
          let lineNum = 0;
          for await (const line of rl) {
            lineNum++;
            let matches: string[] | null = null;
            if (regex) {
              try {
                const re = new RegExp(query, case_sensitive ? '' : 'i');
                matches = line.match(re) ?? null;
              } catch (e: any) {
                throw new Error('Invalid regex: ' + e.message);
              }
            } else {
              const haystack = case_sensitive ? line : line.toLowerCase();
              const needle = case_sensitive ? query : query.toLowerCase();
              if (haystack.includes(needle)) {
                const index = haystack.indexOf(needle);
                matches = [line.substring(index, index + query.length)];
              }
            }
            if (matches) {
              const arr: string[] = Array.from(matches as readonly string[]);
              for (const m of arr) {
                results.push({
                  file: path.relative(absRoot, fullPath),
                  line,
                  line_number: lineNum,
                  match: m
                });
                if (results.length >= max_results) return;
              }
            }
          }
        } catch { continue; }
      }
      if (results.length >= max_results) return;
    }
  }

  await walk(absPath);
  return { results };
}
