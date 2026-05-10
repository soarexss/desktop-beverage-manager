export function money(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  return numeric.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function numberPt(value: number | string | null | undefined, digits = 0) {
  return Number(value ?? 0).toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function datePt(value: string | Date | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("pt-BR");
}

export function dateTimePt(value: string | Date | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
