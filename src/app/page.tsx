'use client';

import { useRouter } from 'next/navigation';
import CompanySearch from '@/components/CompanySearch';
import { Company } from '@/types/company';

export default function Home() {
  const router = useRouter();

  const handleCompanySelect = (company: Company) => {
    router.push(`/submissions/${company.cik_str}`);
  };

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
      </main>
    </div>
  );
}
