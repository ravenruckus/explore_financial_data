'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SECSubmissions } from '@/types/company';

interface SubmissionsDisplayProps {
  cik: number;
  initialDate?: string;
}

const itemsPerPage = 15;

export default function SubmissionsDisplay({ cik, initialDate }: SubmissionsDisplayProps) {
  const [submissions, setSubmissions] = useState<SECSubmissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFieldType, setDateFieldType] = useState<'filingDate' | 'reportDate'>('filingDate');
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || '');
  const [formTypeFilter, setFormTypeFilter] = useState<string>('');
  const [contextSize, setContextSize] = useState<number>(5);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

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

  // Helper function to build SEC document URL
  const buildDocumentUrl = (accessionNumber: string | null | undefined, primaryDocument: string | null | undefined): string | null => {
    if (!accessionNumber || !primaryDocument) return null;
    // Remove dashes from accession number for URL
    const formattedAccessionNumber = accessionNumber.replace(/-/g, '');
    // Format CIK with zero-padding to 10 digits
    const formattedCik = String(cik).padStart(10, '0');
    return `https://www.sec.gov/Archives/edgar/data/${formattedCik}/${formattedAccessionNumber}/${primaryDocument}`;
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

  // Reset filters when CIK changes
  useEffect(() => {
    setSelectedDate(initialDate || '');
    setFormTypeFilter('');
    setContextSize(5);
    setCurrentPage(1);
  }, [cik, initialDate]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDate, formTypeFilter, contextSize, dateFieldType]);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      // Check if dark class is present on html element (class-based dark mode)
      if (document.documentElement.classList.contains('dark')) {
        setIsDarkMode(true);
        return;
      }
      // Otherwise check media query (system preference)
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setIsDarkMode(mediaQuery.matches);
    };

    checkDarkMode();

    // Listen for media query changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      // Only update if dark class is not present (media query takes precedence when no class)
      if (!document.documentElement.classList.contains('dark')) {
        setIsDarkMode(e.matches);
      }
    };

    // Listen for class changes on html element
    const observer = new MutationObserver(() => {
      checkDarkMode();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    mediaQuery.addEventListener('change', handleMediaChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      observer.disconnect();
    };
  }, []);

  if (loading) {
    return (
      <div className="w-full mt-8 p-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
          <span className="ml-6 text-lg text-gray-600 dark:text-gray-400">
            Loading submissions...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full mt-8 p-8 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
        <h3 className="text-xl font-semibold text-red-800 dark:text-red-400 mb-3">
          Error
        </h3>
        <p className="text-base text-red-600 dark:text-red-300">{error}</p>
      </div>
    );
  }

  if (!submissions) {
    return null;
  }

  const recentFilings = submissions.filings?.recent;
  const totalFilingCount = recentFilings?.form?.length || 0;

  // Get unique form types for suggestions
  const uniqueFormTypes = recentFilings?.form 
    ? Array.from(new Set(recentFilings.form.filter(Boolean))).sort()
    : [];

  // Get indices around the selected date and track which ones match exactly
  const getFilteredIndices = (): { indices: number[]; exactMatchIndices: Set<number> } => {
    if (!recentFilings) {
      return {
        indices: Array.from({ length: totalFilingCount }, (_, i) => i),
        exactMatchIndices: new Set<number>()
      };
    }

    // First, filter by form type if a filter is set
    let formFilteredIndices: number[] = [];
    if (formTypeFilter.trim()) {
      const lowerFormFilter = formTypeFilter.toLowerCase().trim();
      for (let i = 0; i < totalFilingCount; i++) {
        const formType = recentFilings.form?.[i];
        if (formType && formType.toLowerCase().includes(lowerFormFilter)) {
          formFilteredIndices.push(i);
        }
      }
    } else {
      formFilteredIndices = Array.from({ length: totalFilingCount }, (_, i) => i);
    }

    // If no date filter is set, return form-filtered indices
    if (!selectedDate) {
      return {
        indices: formFilteredIndices,
        exactMatchIndices: new Set<number>()
      };
    }

    const dateArray = dateFieldType === 'filingDate' 
      ? recentFilings.filingDate 
      : recentFilings.reportDate;

    if (!dateArray) {
      return {
        indices: formFilteredIndices,
        exactMatchIndices: new Set<number>()
      };
    }

    // Find exact matches and their indices (only from form-filtered indices)
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
    
    // Only check dates for indices that passed the form filter
    for (const i of formFilteredIndices) {
      const dateValue = dateArray[i];
      if (dateValue) {
        const normalizedDateValue = normalizeDate(dateValue);
        if (normalizedDateValue && normalizedSelectedDate && normalizedDateValue === normalizedSelectedDate) {
          exactMatchIndices.add(i);
        }
        dateIndices.push({ index: i, date: dateValue });
      }
    }

    // If we have exact matches, show filings around them (but only from form-filtered indices)
    if (exactMatchIndices.size > 0) {
      const allIndices = new Set<number>();
      
      // Add exact matches and context around each (but only include indices that pass form filter)
      exactMatchIndices.forEach(matchIndex => {
        const start = Math.max(0, matchIndex - contextSize);
        const end = Math.min(totalFilingCount - 1, matchIndex + contextSize);
        for (let i = start; i <= end; i++) {
          // Only include if it passes the form filter
          if (formFilteredIndices.includes(i)) {
            allIndices.add(i);
          }
        }
      });
      
      return {
        indices: Array.from(allIndices).sort((a, b) => a - b),
        exactMatchIndices
      };
    }

    // If no exact matches, find the closest date and show context around it
    if (!normalizedSelectedDate) {
      return {
        indices: formFilteredIndices,
        exactMatchIndices: new Set<number>()
      };
    }
    
    const selectedDateObj = new Date(normalizedSelectedDate);
    // Validate the date is valid
    if (isNaN(selectedDateObj.getTime())) {
      return {
        indices: formFilteredIndices,
        exactMatchIndices: new Set<number>()
      };
    }
    
    let closestIndex = -1;
    let minDiff = Infinity;

    for (let i = 0; i < dateIndices.length; i++) {
      const normalizedDateValue = normalizeDate(dateIndices[i].date);
      if (!normalizedDateValue) continue;
      
      const dateObj = new Date(normalizedDateValue);
      if (isNaN(dateObj.getTime())) continue;
      
      const diff = Math.abs(selectedDateObj.getTime() - dateObj.getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = dateIndices[i].index;
      }
    }

    if (closestIndex >= 0) {
      const start = Math.max(0, closestIndex - contextSize);
      const end = Math.min(totalFilingCount - 1, closestIndex + contextSize);
      const indices: number[] = [];
      for (let i = start; i <= end; i++) {
        // Only include if it passes the form filter
        if (formFilteredIndices.includes(i)) {
          indices.push(i);
        }
      }
      return {
        indices,
        exactMatchIndices: new Set<number>()
      };
    }

    // Fallback: return form-filtered indices
    return {
      indices: formFilteredIndices,
      exactMatchIndices: new Set<number>()
    };
  };

  const { indices: filteredIndices, exactMatchIndices } = getFilteredIndices();
  const filingCount = filteredIndices.length;
  const isDateFilterActive = selectedDate !== '';
  const isFormFilterActive = formTypeFilter.trim() !== '';
  const isFilterActive = isDateFilterActive || isFormFilterActive;

  // Pagination
  const totalPages = Math.ceil(filingCount / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedIndices = filteredIndices.slice(startIndex, endIndex);

  return (
    <div className="w-full mt-8 space-y-6">
      {/* Company Information */}
      <div className="bg-white rounded-lg shadow-md p-8 dark:bg-gray-800">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
          {submissions.name || 'N/A'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="text-base font-semibold text-gray-600 dark:text-gray-400">
              CIK:
            </span>
            <span className="ml-2 text-base text-gray-900 dark:text-white">
              {submissions.cik}
            </span>
          </div>
          {submissions.tickers && submissions.tickers.length > 0 && (
            <div>
              <span className="text-base font-semibold text-gray-600 dark:text-gray-400">
                Ticker(s):
              </span>
              <span className="ml-2 text-base text-gray-900 dark:text-white">
                {submissions.tickers.join(', ')}
              </span>
            </div>
          )}
          {submissions.sic && (
            <div>
              <span className="text-base font-semibold text-gray-600 dark:text-gray-400">
                SIC:
              </span>
              <span className="ml-2 text-base text-gray-900 dark:text-white">
                {submissions.sic} - {submissions.sicDescription || 'N/A'}
              </span>
            </div>
          )}
          {submissions.exchanges && submissions.exchanges.length > 0 && (
            <div>
              <span className="text-base font-semibold text-gray-600 dark:text-gray-400">
                Exchange(s):
              </span>
              <span className="ml-2 text-base text-gray-900 dark:text-white">
                {submissions.exchanges.join(', ')}
              </span>
            </div>
          )}
          {submissions.fiscalYearEnd && (
            <div>
              <span className="text-base font-semibold text-gray-600 dark:text-gray-400">
                Fiscal Year End:
              </span>
              <span className="ml-2 text-base text-gray-900 dark:text-white">
                {submissions.fiscalYearEnd}
              </span>
            </div>
          )}
          {submissions.stateOfIncorporationDescription && (
            <div>
              <span className="text-base font-semibold text-gray-600 dark:text-gray-400">
                State of Incorporation:
              </span>
              <span className="ml-2 text-base text-gray-900 dark:text-white">
                {submissions.stateOfIncorporationDescription}
              </span>
            </div>
          )}
        </div>
        {submissions.description && (
          <div className="mt-6">
            <span className="text-base font-semibold text-gray-600 dark:text-gray-400">
              Description:
            </span>
            <p className="mt-2 text-base text-gray-900 dark:text-white">
              {submissions.description}
            </p>
          </div>
        )}
      </div>

      {/* Recent Filings */}
      {recentFilings && totalFilingCount > 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 dark:bg-gray-800">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Recent Filings {isFilterActive ? `(showing ${filingCount} of ${totalFilingCount})` : `(${totalFilingCount})`}
          </h3>
          
          {/* Filter Section */}
          <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 space-y-6">
            {/* Form Type Filter */}
            <div>
              <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
                Filter by Form Type
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formTypeFilter}
                  onChange={(e) => setFormTypeFilter(e.target.value)}
                  placeholder="Search by form type (e.g., 10-K, 10-Q, 8-K)"
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
                {formTypeFilter && (
                  <button
                    onClick={() => setFormTypeFilter('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ×
                  </button>
                )}
              </div>
              {uniqueFormTypes.length > 0 && !formTypeFilter && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Available forms: {uniqueFormTypes.slice(0, 10).join(', ')}
                  {uniqueFormTypes.length > 10 && ` and ${uniqueFormTypes.length - 10} more`}
                </p>
              )}
            </div>

            {/* Date Filter */}
            <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end">
              <div className="flex-1">
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Filter by Date Field
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="filingDate"
                      checked={dateFieldType === 'filingDate'}
                      onChange={(e) => setDateFieldType(e.target.value as 'filingDate' | 'reportDate')}
                      className="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                    />
                    <span className="text-base text-gray-700 dark:text-gray-300">Filing Date</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="reportDate"
                      checked={dateFieldType === 'reportDate'}
                      onChange={(e) => setDateFieldType(e.target.value as 'filingDate' | 'reportDate')}
                      className="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500"
                    />
                    <span className="text-base text-gray-700 dark:text-gray-300">Report Date</span>
                  </label>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                />
              </div>
              {isFilterActive && (
                <button
                  onClick={() => {
                    setSelectedDate('');
                    setFormTypeFilter('');
                    setContextSize(5);
                  }}
                  className="px-6 py-3 text-base font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md transition-colors dark:bg-gray-500 dark:hover:bg-gray-600"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            {/* Context Size Slider - only show when date is selected */}
            {isDateFilterActive && (
              <div>
                <label id="context-size-label" className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
                Number of filings before and after selected date: {contextSize}
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={contextSize}
                    onChange={(e) => setContextSize(Number(e.target.value))}
                    aria-labelledby="context-size-label"
                    aria-valuemin={0}
                    aria-valuemax={50}
                    aria-valuenow={contextSize}
                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(contextSize / 50) * 100}%, ${isDarkMode ? '#4b5563' : '#e5e7eb'} ${(contextSize / 50) * 100}%, ${isDarkMode ? '#4b5563' : '#e5e7eb'} 100%)`
                    }}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400 min-w-[60px] text-right">
                    {contextSize} filing{contextSize !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Form
                  </th>
                  <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Filing Date
                  </th>
                  <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Report Date
                  </th>
                  <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {paginatedIndices.map((originalIndex) => {
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
                      <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900 dark:text-white">
                        {recentFilings.form?.[originalIndex] || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-600 dark:text-gray-400">
                        {recentFilings.filingDate?.[originalIndex]
                          ? recentFilings.filingDate[originalIndex]
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base text-gray-600 dark:text-gray-400">
                        {recentFilings.reportDate?.[originalIndex]
                          ? recentFilings.reportDate[originalIndex]
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-base text-gray-600 dark:text-gray-400">
                        {(() => {
                          const description = recentFilings.primaryDocDescription?.[originalIndex];
                          const accessionNumber = recentFilings.accessionNumber?.[originalIndex];
                          const primaryDocument = recentFilings.primaryDocument?.[originalIndex];
                          const documentUrl = buildDocumentUrl(accessionNumber, primaryDocument);
                          
                          if (documentUrl && description) {
                            return (
                              <a
                                href={documentUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                              >
                                {description}
                              </a>
                            );
                          }
                          return description || 'N/A';
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-base">
                        {(() => {
                          const accessionNumber = recentFilings.accessionNumber?.[originalIndex];
                          console.log('accessionNumber', accessionNumber)
                          if (accessionNumber) {
                            return (
                              <Link
                                href={`/company-facts/${cik}?accessionNumber=${encodeURIComponent(accessionNumber)}`}
                                className="inline-flex items-center px-4 py-2 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors dark:bg-blue-500 dark:hover:bg-blue-600"
                              >
                                View Facts
                              </Link>
                            );
                          }
                          return <span className="text-base text-gray-400 dark:text-gray-500">N/A</span>;
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-base text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Go to previous page"
                  className="px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors dark:bg-blue-500 dark:hover:bg-blue-600 dark:disabled:bg-gray-600"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Go to next page"
                  className="px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors dark:bg-blue-500 dark:hover:bg-blue-600 dark:disabled:bg-gray-600"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {isDateFilterActive && exactMatchIndices.size === 0 && (
            <p className="mt-6 text-base text-amber-600 dark:text-amber-400">
              No filings found on the selected date. Showing filings around the closest date.
            </p>
          )}
          {isDateFilterActive && exactMatchIndices.size > 0 && (
            <p className="mt-6 text-base text-green-600 dark:text-green-400">
              Found {exactMatchIndices.size} filing(s) on the selected date (highlighted in yellow).
            </p>
          )}
          {isFormFilterActive && filingCount === 0 && (
            <p className="mt-6 text-base text-amber-600 dark:text-amber-400">
              No filings found matching "{formTypeFilter}".
            </p>
          )}
          {isFormFilterActive && filingCount > 0 && (
            <p className="mt-6 text-base text-blue-600 dark:text-blue-400">
              Showing {filingCount} filing(s) matching "{formTypeFilter}".
            </p>
          )}
          {filingCount > itemsPerPage && (
            <p className="mt-6 text-base text-gray-500 dark:text-gray-400">
              Showing {startIndex + 1}-{Math.min(endIndex, filingCount)} of {filingCount} {isFilterActive ? 'filtered' : ''} filing{filingCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

