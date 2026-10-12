export const TAX_REGIMES = {
  MEI: '4',
  SIMPLES_NACIONAL: '1',
  SIMPLES_EXCESSO_SUBLIMITE: '2',
  LUCRO_PRESUMIDO: '3',
  LUCRO_REAL: '3',
  OUTRO_REGIME_NORMAL: '3',
} as const;

export const STATES =
  'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(
    ' ',
  );

export function normalizeCnpj(value: string) {
  return value.toUpperCase().replace(/[./\s-]/g, '');
}

export function validCnpj(value: string) {
  const document = normalizeCnpj(value);
  if (!/^[A-Z0-9]{12}\d{2}$/.test(document) || /^(.)\1{13}$/.test(document))
    return false;
  const digit = (base: string, weights: number[]) => {
    const sum = [...base].reduce(
      (total, char, index) =>
        total + (char.charCodeAt(0) - 48) * weights[index],
      0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? '0' : String(11 - remainder);
  };
  const first = digit(
    document.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const second = digit(
    document.slice(0, 12) + first,
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return document.slice(12) === first + second;
}
