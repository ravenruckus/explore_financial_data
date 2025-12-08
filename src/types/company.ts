export interface Company {
  cik_str: number;
  ticker: string;
  title: string;
}

export interface CompanyTickers {
  [key: string]: Company;
}

export interface RecentFiling {
  accessionNumber: string[];
  filingDate: string[];
  reportDate: string[];
  acceptanceDateTime: string[];
  act: string[];
  form: string[];
  fileNumber: string[];
  filmNumber: string[];
  items: string[];
  size: string[];
  isXBRL: string[];
  isInlineXBRL: string[];
  primaryDocument: string[];
  primaryDocDescription: string[];
}

export interface SECSubmissions {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  insiderTransactionForOwnerExists: number;
  insiderTransactionForIssuerExists: number;
  name: string;
  tickers: string[];
  exchanges: string[];
  ein: string;
  description: string;
  website: string;
  investorWebsite: string;
  category: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  stateOfIncorporationDescription: string;
  addresses: {
    mailing: {
      street1: string;
      street2?: string;
      city: string;
      stateOrCountry: string;
      zipCode: string;
      stateOrCountryDescription: string;
    };
    business: {
      street1: string;
      street2?: string;
      city: string;
      stateOrCountry: string;
      zipCode: string;
      stateOrCountryDescription: string;
    };
  };
  phone: string;
  flags: string;
  formerNames: Array<{
    name: string;
    from: string;
    to: string;
  }>;
  filings: {
    recent: RecentFiling;
    files: Array<{
      name: string;
      filingCount: number;
      filingFrom: string;
      filingTo: string;
    }>;
  };
}

// Company Facts Types
export interface FactValue {
  val: number | string | null;
  accn: string;
  end?: string;
  filed?: string;
  fp?: string;
  form?: string;
  fy?: string;
  start?: string;
  frame?: string;
}

export interface Fact {
  label: string;
  description?: string;
  units: {
    [unit: string]: FactValue[];
  };
}

export interface Facts {
  [taxonomy: string]: {
    [concept: string]: Fact;
  };
}

export interface CompanyFacts {
  cik: string;
  entityType: string;
  name: string;
  facts: Facts;
}

