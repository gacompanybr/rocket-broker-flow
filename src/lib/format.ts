export const brl = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value ?? 0),
  );

export const num = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR").format(Number(value ?? 0));

export const pct = (value: number | null | undefined, digits = 1) =>
  `${Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;

export const dateBR = (value: string | Date | null | undefined) => {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
};

export const dayLabel = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
