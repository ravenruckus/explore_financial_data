import { useMemo } from 'react';
import { Company } from '@/types/company';
import { FeaturedCompany } from '@/content/featuredCompanies';

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
    const duplicates: string[] = [];

    companies.forEach(company => {
      const normalizedName = company.title.trim().toLowerCase();

      // Check for duplicates with DIFFERENT CIKs (actual collisions)
      if (map.has(normalizedName)) {
        const existing = map.get(normalizedName)!;
        // Only warn if different companies have the same name
        if (existing.cik_str !== company.cik_str) {
          duplicates.push(
            `"${normalizedName}" (CIK: ${existing.cik_str} vs ${company.cik_str})`
          );
        }
      }

      map.set(normalizedName, company);
    });

    // Warn about name collisions in development only
    if (process.env.NODE_ENV !== 'production' && duplicates.length > 0) {
      console.warn(
        `Found ${duplicates.length} company name collision(s) with different CIKs:`,
        duplicates
      );
    }

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

        if (process.env.NODE_ENV !== 'production') {
          console.warn(`Featured company not found: ${featured.name}`);
        }
        return null;
      })
      .filter((item): item is FeaturedCompanyWithCIK => item !== null);
  }, [companiesByName, featuredCompanies]);

  return featuredCompaniesWithCIKs;
}
