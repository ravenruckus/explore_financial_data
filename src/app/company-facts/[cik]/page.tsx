import { Suspense } from 'react';
import CompanyFactsDisplay from '@/components/CompanyFactsDisplay';
import Link from 'next/link';

interface CompanyFactsPageProps {
  params: Promise<{ cik: string }>;
  searchParams: Promise<{ accessionNumber?: string }>;
}

async function getCompanyFacts(cik: string) {
  try {
    // Format CIK with zero-padding to 10 digits
    const formattedCik = String(cik).padStart(10, '0');
    const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${formattedCik}.json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Company Search App contact@example.com',
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Company facts not found for this CIK');
      }
      throw new Error(`SEC API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching company facts:', error);
    throw error;
  }
}

export default async function CompanyFactsPage({
  params,
  searchParams,
}: CompanyFactsPageProps) {
  const { cik } = await params;
  const { accessionNumber } = await searchParams;

  if (!accessionNumber) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <main className="mx-auto px-8 py-8 max-w-[95vw]">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 dark:bg-red-900/20 dark:border-red-800">
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-400 mb-3">
              Accession Number Required
            </h2>
            <p className="text-base text-red-600 dark:text-red-300 mb-6">
              Please select a form from the submissions page to view its company facts.
            </p>
            <Link
              href="/"
              className="text-base text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Back to Company Search
            </Link>
          </div>
        </main>
      </div>
    );
  }

  let companyFacts;
  let error: string | null = null;

  try {
    companyFacts = await getCompanyFacts(cik);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load company facts';
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <main className="mx-auto px-8 py-8 max-w-[95vw]">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 dark:bg-red-900/20 dark:border-red-800">
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-400 mb-3">
              Error
            </h2>
            <p className="text-base text-red-600 dark:text-red-300 mb-6">{error}</p>
            <Link
              href="/"
              className="text-base text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Back to Company Search
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto px-8 py-8 max-w-[95vw]">
        <div className="mb-8">
          <Link
            href="/"
            className="text-base text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 mb-6 inline-block"
          >
            ← Back to Company Search
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
            Company Facts
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {companyFacts?.name || 'N/A'} (CIK: {cik})
          </p>
        </div>

        <Suspense
          fallback={
            <div className="w-full mt-8 p-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <span className="ml-6 text-lg text-gray-600 dark:text-gray-400">
                  Loading company facts...
                </span>
              </div>
            </div>
          }
        >
          <CompanyFactsDisplay
            companyFacts={companyFacts}
            accessionNumber={accessionNumber}
          />
        </Suspense>
      </main>
    </div>
  );
}

