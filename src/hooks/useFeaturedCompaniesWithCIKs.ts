import { useMemo } from 'react';
import { Company } from '@/types/company';

type FeaturedCompany = {
  name: string;
  date: string;
};

export type FeaturedCompanyWithCIK = {
  name: string;
  date: string;
  cik: number;
  ticker: string;
};

export function useFeaturedCompaniesWithCIKs(
  companies: Company[],
  featuredCompanies: FeaturedCompany[]
): FeaturedCompanyWithCIK[] {
  // Create lookup map for efficient company name matching
  const companiesByName = useMemo(() => {
    const map = new Map<string, Company>();
    companies.forEach(company => {
      map.set(company.title.trim().toLowerCase(), company);
    });
    return map;
  }, [companies]);

  // Find CIKs for featured companies
  const featuredCompaniesWithCIKs = useMemo(() => {
    return featuredCompanies
      .map((featured) => {
        // Remove quotes from company name for matching
        const normalizedName = featured.name.trim().replace(/^["']+|["']+$/g, '').toLowerCase();

        // Find matching company using Map lookup
        const matchedCompany = companiesByName.get(normalizedName);

        if (matchedCompany) {
          return {
            ...featured,
            cik: matchedCompany.cik_str,
            ticker: matchedCompany.ticker,
          };
        }

        console.warn(`Featured company not found: ${featured.name}`);
        return null;
      })
      .filter((item): item is FeaturedCompanyWithCIK => item !== null);
  }, [companiesByName, featuredCompanies]);

  return featuredCompaniesWithCIKs;
}
