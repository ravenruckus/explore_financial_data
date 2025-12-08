'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import CompanySearch from '@/components/CompanySearch';
import { Company, CompanyTickers } from '@/types/company';
import companyTickersData from '@/data/company_tickers.json';
import { featuredCompanies } from '@/content/featuredCompanies';

const companyTickers = companyTickersData as CompanyTickers;

export default function Home() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);

  // Load companies from JSON file
  useEffect(() => {
    const companiesArray = Object.values(companyTickers) as Company[];
    setCompanies(companiesArray);
  }, []);

  const handleCompanySelect = (company: Company) => {
    router.push(`/submissions/${company.cik_str}`);
  };

  // Find CIKs for featured companies
  const featuredCompaniesWithCIKs = useMemo(() => {
    return featuredCompanies
      .map((featured) => {
        // Remove quotes from company name for matching
        const normalizedName = featured.name.replace(/^"|"$/g, '');
        
        // Find matching company (case-insensitive)
        const matchedCompany = companies.find((company) => {
          const companyTitle = company.title.trim();
          return companyTitle.toLowerCase() === normalizedName.toLowerCase();
        });

        if (matchedCompany) {
          return {
            ...featured,
            cik: matchedCompany.cik_str,
            ticker: matchedCompany.ticker,
          };
        }
        return null;
      })
      .filter((item): item is typeof item & { cik: number; ticker: string } => item !== null);
  }, [companies]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto px-8 py-8 max-w-[95vw]">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            SEC Company Search
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Search for companies and view their SEC submissions
          </p>
        </div>

        <div className="mb-8">
          <CompanySearch onCompanySelect={handleCompanySelect} />
        </div>

        {featuredCompaniesWithCIKs.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Featured Companies
            </h2>
            <div className="bg-white rounded-lg shadow-md p-6 dark:bg-gray-800">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredCompaniesWithCIKs.map((company) => (
                  <Link
                    key={company.cik}
                    href={`/submissions/${company.cik}?date=${company.date}`}
                    className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-colors dark:border-gray-700 dark:hover:bg-gray-700 dark:hover:border-blue-500"
                  >
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">
                      {company.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {company.ticker} • {company.date}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
