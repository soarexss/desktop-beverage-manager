export const taxRegimes = {
  MEI: "MEI (CRT 4)",
  SIMPLES_NACIONAL: "Simples Nacional (CRT 1)",
  SIMPLES_EXCESSO_SUBLIMITE: "Simples — excesso de sublimite (CRT 2)",
  LUCRO_PRESUMIDO: "Lucro Presumido (CRT 3)",
  LUCRO_REAL: "Lucro Real (CRT 3)",
  OUTRO_REGIME_NORMAL: "Outro regime normal (CRT 3)",
} as const;
export type CompanyProfile = {
  id: string;
  legalName: string;
  tradeName: string;
  document: string;
  stateRegistration: string | null;
  municipalRegistration: string | null;
  taxRegime: keyof typeof taxRegimes;
  primaryCnae: string | null;
  secondaryCnaes: string[];
  address: string | null;
  city: string | null;
  state: string | null;
  municipalityCode: string | null;
  postalCode: string | null;
  pixEnabled: boolean;
  pixKey: string | null;
  pixMerchantName: string | null;
  pixMerchantCity: string | null;
  crt: string;
  fiscalEmissionEnabled: false;
};
