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
  const [dateFieldType, setDateFieldType] = useState<'filingDate' | 'reportDate'>('filingDate');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Helper function to normalize dates for comparison
  const normalizeDate = (dateStr: string | null | undefined): string | null => {
    if (!dateStr) return null;
    // Trim whitespace and extract just the date part (YYYY-MM-DD) if there's a time component
    const trimmed = String(dateStr).trim();
    // If the date includes time, extract just the date part
    // Handle both ISO format (YYYY-MM-DDTHH:mm:ss) and space-separated format
    const datePart = trimmed.split('T')[0].split(' ')[0];
    // Validate that it looks like a date (YYYY-MM-DD format)
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      return datePart;
    }
    return null;
  };

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

  // Reset filter when CIK changes
  useEffect(() => {
    setSelectedDate('');
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
  const totalFilingCount = recentFilings?.form?.length || 0;

  // Get indices around the selected date and track which ones match exactly
  const getFilteredIndices = (): { indices: number[]; exactMatchIndices: Set<number> } => {
    if (!recentFilings || !selectedDate) {
      return {
        indices: Array.from({ length: totalFilingCount }, (_, i) => i),
        exactMatchIndices: new Set<number>()
      };
    }

    const dateArray = dateFieldType === 'filingDate' 
      ? recentFilings.filingDate 
      : recentFilings.reportDate;

    if (!dateArray) {
      return {
        indices: Array.from({ length: totalFilingCount }, (_, i) => i),
        exactMatchIndices: new Set<number>()
      };
    }

    // Find exact matches and their indices
    const exactMatchIndices = new Set<number>();
    const dateIndices: { index: number; date: string }[] = [];
    const normalizedSelectedDate = normalizeDate(selectedDate);
    
    // Debug: Log the first few dates to help diagnose issues
    if (dateArray.length > 0) {
      console.log('Date filter debug:', {
        selectedDate,
        normalizedSelectedDate,
        dateFieldType,
        firstFewDates: dateArray.slice(0, 5).map(d => ({ original: d, normalized: normalizeDate(d) }))
      });
    }
    
    for (let i = 0; i < dateArray.length; i++) {
      const dateValue = dateArray[i];
      if (dateValue) {
        const normalizedDateValue = normalizeDate(dateValue);
        if (normalizedDateValue && normalizedSelectedDate && normalizedDateValue === normalizedSelectedDate) {
          exactMatchIndices.add(i);
        }
        dateIndices.push({ index: i, date: dateValue });
      }
    }

    // If we have exact matches, show filings around them
    if (exactMatchIndices.size > 0) {
      const contextSize = 5; // Show 5 filings before and after
      const allIndices = new Set<number>();
      
      // Add exact matches and context around each
      exactMatchIndices.forEach(matchIndex => {
        const start = Math.max(0, matchIndex - contextSize);
        const end = Math.min(totalFilingCount - 1, matchIndex + contextSize);
        for (let i = start; i <= end; i++) {
          allIndices.add(i);
        }
      });
      
      return {
        indices: Array.from(allIndices).sort((a, b) => a - b),
        exactMatchIndices
      };
    }

    // If no exact matches, find the closest date and show context around it
    const selectedDateObj = new Date(selectedDate);
    let closestIndex = -1;
    let minDiff = Infinity;

    for (let i = 0; i < dateIndices.length; i++) {
      const dateObj = new Date(dateIndices[i].date);
      const diff = Math.abs(selectedDateObj.getTime() - dateObj.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = dateIndices[i].index;
      }
    }

    if (closestIndex >= 0) {
      const contextSize = 5;
      const start = Math.max(0, closestIndex - contextSize);
      const end = Math.min(totalFilingCount - 1, closestIndex + contextSize);
      const indices: number[] = [];
      for (let i = start; i <= end; i++) {
        indices.push(i);
      }
      return {
        indices,
        exactMatchIndices: new Set<number>()
      };
    }

    // Fallback: return all indices
    return {
      indices: Array.from({ length: totalFilingCount }, (_, i) => i),
      exactMatchIndices: new Set<number>()
    };
  };

  const { indices: filteredIndices, exactMatchIndices } = getFilteredIndices();
  const filingCount = filteredIndices.length;
  const isFilterActive = selectedDate !== '';

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
      {recentFilings && totalFilingCount > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 dark:bg-gray-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Recent Filings {isFilterActive ? `(showing ${filingCount} around selected date of ${totalFilingCount})` : `(${totalFilingCount})`}
          </h3>
          
          {/* Filter Section */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Date Field
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="filingDate"
                      checked={dateFieldType === 'filingDate'}
                      onChange={(e) => setDateFieldType(e.target.value as 'filingDate' | 'reportDate')}
                      className="mr-2 text-blue-600 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Filing Date</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="reportDate"
                      checked={dateFieldType === 'reportDate'}
                      onChange={(e) => setDateFieldType(e.target.value as 'filingDate' | 'reportDate')}
                      className="mr-2 text-blue-600 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Report Date</span>
                  </label>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
              </div>
              {isFilterActive && (
                <button
                  onClick={() => setSelectedDate('')}
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md transition-colors dark:bg-gray-500 dark:hover:bg-gray-600"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>

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
                {filteredIndices.slice(0, 20).map((originalIndex) => {
                  const isExactMatch = exactMatchIndices.has(originalIndex);
                  return (
                    <tr
                      key={originalIndex}
                      className={`transition-colors ${
                        isExactMatch
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/40'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {recentFilings.form?.[originalIndex] || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {recentFilings.filingDate?.[originalIndex]
                          ? recentFilings.filingDate[originalIndex]
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {recentFilings.reportDate?.[originalIndex]
                          ? recentFilings.reportDate[originalIndex]
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {recentFilings.primaryDocDescription?.[originalIndex] || 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {isFilterActive && exactMatchIndices.size === 0 && (
            <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
              No filings found on the selected date. Showing filings around the closest date.
            </p>
          )}
          {isFilterActive && exactMatchIndices.size > 0 && (
            <p className="mt-4 text-sm text-green-600 dark:text-green-400">
              Found {exactMatchIndices.size} filing(s) on the selected date (highlighted in yellow).
            </p>
          )}
          {filingCount > 20 && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Showing 20 of {filingCount} {isFilterActive ? 'around selected date' : ''} filings
            </p>
          )}
        </div>
      )}
    </div>
  );
}

