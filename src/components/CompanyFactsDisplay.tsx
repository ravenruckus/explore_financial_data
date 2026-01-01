'use client';

import { useState, useMemo, useDeferredValue, useCallback, useEffect } from 'react';
import { CompanyFacts, Fact, FactValue } from '@/types/company';

interface CompanyFactsDisplayProps {
  companyFacts: CompanyFacts | null;
  accessionNumber: string;
}

interface FlattenedFact {
  taxonomy: string;
  concept: string;
  label: string;
  description?: string;
  unit: string;
  values: FactValue[];
}

export default function CompanyFactsDisplay({
  companyFacts,
  accessionNumber,
}: CompanyFactsDisplayProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTaxonomy, setSelectedTaxonomy] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const factsPerPage = 50;
 console.log('companyFacts', companyFacts)

  // Debounce search term
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Normalize accession number for comparison (remove dashes)
  const normalizeAccessionNumber = useCallback((accn: string): string => {
    return accn.replace(/-/g, '').toLowerCase();
  }, []);

  const normalizedTargetAccn = useMemo(
    () => normalizeAccessionNumber(accessionNumber),
    [accessionNumber, normalizeAccessionNumber]
  );

  // Flatten and filter facts by accessionNumber
  const flattenedFacts = useMemo(() => {
    if (!companyFacts?.facts) return [];

    const facts: FlattenedFact[] = [];

    Object.entries(companyFacts.facts).forEach(([taxonomy, concepts]) => {
      Object.entries(concepts).forEach(([concept, fact]) => {
        Object.entries(fact.units).forEach(([unit, values]) => {
          // Filter values by accessionNumber
          const filteredValues = values.filter((value) => {
            const normalizedAccn = normalizeAccessionNumber(value.accn);
            return normalizedAccn === normalizedTargetAccn;
          });

   
          if (filteredValues.length > 0) {
            facts.push({
              taxonomy,
              concept,
              label: fact.label,
              description: fact.description,
              unit,
              values: filteredValues,
            });
          }
        });
      });
    });

    return facts;
  }, [companyFacts, normalizedTargetAccn, normalizeAccessionNumber]);

  // Get unique taxonomies and units for filters
  const uniqueTaxonomies = useMemo(() => {
    const taxonomies = new Set<string>();
    flattenedFacts.forEach((fact) => taxonomies.add(fact.taxonomy));
    return Array.from(taxonomies).sort();
  }, [flattenedFacts]);

  const uniqueUnits = useMemo(() => {
    const units = new Set<string>();
    flattenedFacts.forEach((fact) => units.add(fact.unit));
    return Array.from(units).sort();
  }, [flattenedFacts]);

  // Apply filters (search, taxonomy, unit)
  const filteredFacts = useMemo(() => {
    let filtered = flattenedFacts;

    // Filter by search term (concept, label, or description)
    if (deferredSearchTerm.trim()) {
      const searchLower = deferredSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (fact) =>
          (fact.concept?.toLowerCase() || '').includes(searchLower) ||
          (fact.label?.toLowerCase() || '').includes(searchLower) ||
          (fact.description?.toLowerCase() || '').includes(searchLower)
      );
    }

    // Filter by taxonomy
    if (selectedTaxonomy) {
      filtered = filtered.filter((fact) => fact.taxonomy === selectedTaxonomy);
    }

    // Filter by unit
    if (selectedUnit) {
      filtered = filtered.filter((fact) => fact.unit === selectedUnit);
    }

    return filtered;
  }, [flattenedFacts, deferredSearchTerm, selectedTaxonomy, selectedUnit]);

  // Pagination
  const totalPages = Math.ceil(filteredFacts.length / factsPerPage);
  const startIndex = (currentPage - 1) * factsPerPage;
  const endIndex = startIndex + factsPerPage;
  const paginatedFacts = filteredFacts.slice(startIndex, endIndex);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, selectedTaxonomy, selectedUnit]);

  const formatValue = (val: number | string | null): string => {
    if (val === null || val === undefined) return 'N/A';
    if (typeof val === 'number') {
      return val.toLocaleString('en-US', {
        maximumFractionDigits: 2,
      });
    }
    return String(val);
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (!companyFacts) {
    return (
      <div className="w-full mt-8 p-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <p className="text-base text-gray-600 dark:text-gray-400">No company facts data available.</p>
      </div>
    );
  }

  if (flattenedFacts.length === 0) {
    return (
      <div className="w-full mt-8 p-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          No Facts Found
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400">
          No company facts found for accession number: <strong>{accessionNumber}</strong>
        </p>
      </div>
    );
  }
  console.log('flattenedFacts', flattenedFacts)

  return (
    <div className="w-full mt-8 space-y-6">
      {/* Company Info */}
      <div className="bg-white rounded-lg shadow-md p-8 dark:bg-gray-800">
        <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          {companyFacts.name || 'N/A'}
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400">
          Accession Number: <strong>{accessionNumber}</strong>
        </p>
        <p className="text-base text-gray-600 dark:text-gray-400 mt-2">
          Total facts for this filing: <strong>{flattenedFacts.length}</strong>
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-8 dark:bg-gray-800">
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Search */}
          <div>
            <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
              Search Facts
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by concept, label, or description..."
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            />
          </div>

          {/* Taxonomy Filter */}
          <div>
            <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
              Taxonomy
            </label>
            <select
              value={selectedTaxonomy}
              onChange={(e) => setSelectedTaxonomy(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            >
              <option value="">All Taxonomies</option>
              {uniqueTaxonomies.map((taxonomy) => (
                <option key={taxonomy} value={taxonomy}>
                  {taxonomy}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Filter */}
          <div>
            <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
              Unit
            </label>
            <select
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-white"
            >
              <option value="">All Units</option>
              {uniqueUnits.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(searchTerm || selectedTaxonomy || selectedUnit) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedTaxonomy('');
              setSelectedUnit('');
            }}
            className="mt-6 px-6 py-3 text-base font-medium text-white bg-gray-600 hover:bg-gray-700 rounded-md transition-colors dark:bg-gray-500 dark:hover:bg-gray-600"
          >
            Clear All Filters
          </button>
        )}

        {/* Results Count */}
        <p className="mt-6 text-base text-gray-600 dark:text-gray-400">
          Showing {filteredFacts.length} of {flattenedFacts.length} facts
        </p>
      </div>

      {/* Facts Table */}
      <div className="bg-white rounded-lg shadow-md p-8 dark:bg-gray-800">
        <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
          Company Facts
        </h3>

        {paginatedFacts.length === 0 ? (
          <p className="text-base text-gray-600 dark:text-gray-400">
            No facts match the current filters.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Taxonomy
                    </th>
                    <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Concept
                    </th>
                    <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Label
                    </th>
                    <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Unit
                    </th>
                    <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Value
                    </th>
                    <th className="px-6 py-4 text-left text-base font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">
                      Period
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {paginatedFacts.map((fact, idx) => {
                    // Show first value for each fact (can be expanded later)
                    const firstValue = fact.values[0];
                    if (!firstValue) return null;
                    
                    // Create a unique key using taxonomy, concept, unit, and first value's accession number
                    const uniqueKey = `${fact.taxonomy}-${fact.concept}-${fact.unit}-${firstValue.accn || idx}`;
                    return (
                      <tr
                        key={uniqueKey}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 dark:text-white">
                          {fact.taxonomy}
                        </td>
                        <td className="px-6 py-4 text-base font-mono text-gray-900 dark:text-white">
                          {fact.concept}
                        </td>
                        <td className="px-6 py-4 text-base text-gray-600 dark:text-white">
                          <div>
                            <div className="font-medium">{fact.label}</div>
                            {fact.description && (
                              <div className="text-base text-gray-500 dark:text-gray-400 mt-2">
                                {fact.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base text-gray-600 dark:text-gray-400">
                          {fact.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-base font-medium text-gray-900 dark:text-white">
                          {formatValue(firstValue.val)}
                        </td>
                        <td className="px-6 py-4 text-base text-gray-600 dark:text-gray-400">
                          <div className="text-sm">
                            {firstValue.start && (
                              <div>Start: {formatDate(firstValue.start)}</div>
                            )}
                            {firstValue.end && (
                              <div>End: {formatDate(firstValue.end)}</div>
                            )}
                            {firstValue.fp && <div>FP: {firstValue.fp}</div>}
                            {firstValue.fy && <div>FY: {firstValue.fy}</div>}
                          </div>
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
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-6 py-3 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

