export function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return "–";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Formata com até 1 casa, sem zeros à direita: 80 → "80", 79.5 → "79,5". */
export function fmt1(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "–";
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

export function fmtLiters(ml: number): string {
  return (ml / 1000).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function signed(n: number, digits = 1): string {
  const s = fmt(Math.abs(n), digits);
  if (n > 0) return `+${s}`;
  if (n < 0) return `−${s}`;
  return s;
}

/** Converte texto digitado ("78,5") em número; retorna null se inválido. */
export function parseNum(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = v.trim().replace(/\s/g, "").replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function greetingFirstName(name: string | null | undefined): string {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || "";
}
