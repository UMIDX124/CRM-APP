/**
 * Tiny CSV emitter — no external deps.
 *
 * Handles RFC-4180 quoting: any field containing comma, double-quote, CR or
 * LF is wrapped in double quotes; embedded quotes are doubled. Pass `headers`
 * explicitly to control column order, otherwise the keys of the first row
 * are used.
 */

export function rowsToCSV<T extends Record<string, unknown>>(
  rows: T[],
  headers?: string[]
): string {
  if (rows.length === 0) return "";
  const cols = headers ?? Object.keys(rows[0]);
  const escapeCell = (v: unknown): string => {
    if (v === null || v === undefined) return "";
    let s: string;
    if (v instanceof Date) s = v.toISOString();
    else if (typeof v === "object") s = JSON.stringify(v);
    else s = String(v);
    if (/[",\r\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  const lines = [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => escapeCell(r[c])).join(",")),
  ];
  return lines.join("\r\n");
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
