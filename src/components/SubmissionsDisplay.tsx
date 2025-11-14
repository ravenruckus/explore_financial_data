'use client';

import { useState, useEffect } from 'react';
import { SECSubmissions, RecentFiling } from '@/types/company';

interface SubmissionsDisplayProps {
  cik: number;
}

export default function SubmissionsDisplay({ cik }: SubmissionsDisplayProps) {
  const [submissions, setSubmissions] = useState<SECSubmissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // console.log('submissions?.filings?.recent', submissions?.filings?.recent);
  console.log('submissions?.filings?.recent?.form', submissions?.filings?.recent?.form[3  ]);
  console.log('submissions?.filings?.recent?.filingDate', submissions?.filings?.recent?.filingDate[3]);
  console.log('submissions?.filings?.recent?.reportDate', submissions?.filings?.recent?.reportDate[3]);
  console.log('submissions?.filings?.recent?.primaryDocDescription', submissions?.filings?.recent?.primaryDocDescription[3]);
  console.log('submissions?.filings?.recent?.primaryDocument', submissions?.filings?.recent?.primaryDocument[3]);
  console.log('submissions?.filings?.recent?.isXBRL', submissions?.filings?.recent?.isXBRL[3]);
  console.log('submissions?.filings?.recent?.isInlineXBRL', submissions?.filings?.recent?.isInlineXBRL[3]);
  console.log('submissions?.filings?.recent?.accessionNumber', submissions?.filings?.recent?.accessionNumber[3]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/sec-submissions?cik=${cik}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch submissions');
        }
        const data = await response.json();
        setSubmissions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (cik) {
      fetchSubmissions();
    }
  }, [cik]);

  if (loading) {
    return (
      <div className="w-full max-w-4xl mt-8 p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <span className="ml-4 text-gray-600 dark:text-gray-400">
            Loading submissions...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mt-8 p-6 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">
          Error
        </h3>
        <p className="text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (!submissions) {
    return null;
  }

  const recentFilings = submissions.filings?.recent;
  const filingCount = recentFilings?.form?.length || 0;

  return (
    <div className="w-full max-w-4xl mt-8 space-y-6">
      {/* Company Information */}
      <div className="bg-white rounded-lg shadow-md p-6 dark:bg-gray-800">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {submissions.name || 'N/A'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              CIK:
            </span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {submissions.cik}
            </span>
          </div>
          {submissions.tickers && submissions.tickers.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Ticker(s):
              </span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {submissions.tickers.join(', ')}
              </span>
            </div>
          )}
          {submissions.sic && (
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                SIC:
              </span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {submissions.sic} - {submissions.sicDescription || 'N/A'}
              </span>
            </div>
          )}
          {submissions.exchanges && submissions.exchanges.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Exchange(s):
              </span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {submissions.exchanges.join(', ')}
              </span>
            </div>
          )}
          {submissions.fiscalYearEnd && (
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Fiscal Year End:
              </span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {submissions.fiscalYearEnd}
              </span>
            </div>
          )}
          {submissions.stateOfIncorporationDescription && (
            <div>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                State of Incorporation:
              </span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {submissions.stateOfIncorporationDescription}
              </span>
            </div>
          )}
        </div>
        {submissions.description && (
          <div className="mt-4">
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
              Description:
            </span>
            <p className="mt-1 text-gray-900 dark:text-white">
              {submissions.description}
            </p>
          </div>
        )}
      </div>

      {/* Recent Filings */}
      {recentFilings && filingCount > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 dark:bg-gray-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Recent Filings ({filingCount})
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Form
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Filing Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Report Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {Array.from({ length: Math.min(filingCount, 20) }).map((_, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {recentFilings.form?.[index] || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {recentFilings.filingDate?.[index]
                        ? recentFilings.filingDate[index]
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {recentFilings.reportDate?.[index]
                        ? recentFilings.reportDate[index]
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {recentFilings.primaryDocDescription?.[index] || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filingCount > 20 && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Showing 20 of {filingCount} recent filings
            </p>
          )}
        </div>
      )}
    </div>
  );
}

