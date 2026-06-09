import { sql } from '@vercel/postgres';

export { sql };

export async function query(text: string, params?: unknown[]) {
  if (params && params.length > 0) {
    return sql.query(text, params);
  }
  return sql.query(text);
}
