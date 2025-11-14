'use client';

import { useState, useEffect, useMemo } from 'react';
import { Company, CompanyTickers } from '@/types/company';
import companyTickersData from '@/data/company_tickers.json';

const companyTickers = companyTickersData as CompanyTickers;

interface CompanySearchProps {
  onCompanySelect: (company: Company) => void;
}

export default function CompanySearch({ onCompanySelect }: CompanySearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);

  // Load companies from JSON file
  useEffect(() => {
    const companiesArray = Object.values(companyTickers) as Company[];
    setCompanies(companiesArray);
  }, []);

  // Filter companies based on search term
  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) {
      return [];
    }

    const lowerSearchTerm = searchTerm.toLowerCase();
    return companies
      .filter((company) => {
        const tickerMatch = company.ticker.toLowerCase().includes(lowerSearchTerm);
        const titleMatch = company.title.toLowerCase().includes(lowerSearchTerm);
        return tickerMatch || titleMatch;
      })
      .slice(0, 10); // Limit to 10 results
  }, [searchTerm, companies]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleCompanySelect = (company: Company) => {
    setSearchTerm(`${company.ticker} - ${company.title}`);
    setIsOpen(false);
    onCompanySelect(company);
  };

  const handleInputFocus = () => {
    if (filteredCompanies.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay closing to allow click on dropdown item
    setTimeout(() => setIsOpen(false), 200);
  };

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder="Search by company name or ticker (e.g., AAPL, Apple, NVIDIA)"
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-600 dark:text-white"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ×
          </button>
        )}
      </div>

      {isOpen && filteredCompanies.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto dark:bg-gray-800 dark:border-gray-600">
          {filteredCompanies.map((company, index) => (
            <button
              key={`${company.cik_str}-${index}`}
              onClick={() => handleCompanySelect(company)}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {company.ticker}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {company.title}
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  CIK: {company.cik_str}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && searchTerm.trim() && filteredCompanies.length === 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400">
          No companies found
        </div>
      )}
    </div>
  );
}

