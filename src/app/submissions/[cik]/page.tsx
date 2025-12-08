import { Suspense } from 'react';
import SubmissionsDisplay from '@/components/SubmissionsDisplay';
import Link from 'next/link';

interface SubmissionsPageProps {
  params: Promise<{ cik: string }>;
}

export default async function SubmissionsPage({
  params,
}: SubmissionsPageProps) {
  const { cik } = await params;
  const cikNumber = parseInt(cik, 10);

  if (isNaN(cikNumber)) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <main className="mx-auto px-8 py-8 max-w-[95vw]">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 dark:bg-red-900/20 dark:border-red-800">
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-400 mb-3">
              Invalid CIK
            </h2>
            <p className="text-base text-red-600 dark:text-red-300 mb-6">
              The provided CIK is not valid.
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
            SEC Submissions
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            CIK: {cik}
          </p>
        </div>

        <Suspense
          fallback={
            <div className="w-full mt-8 p-8 bg-white rounded-lg shadow-md dark:bg-gray-800">
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <span className="ml-6 text-lg text-gray-600 dark:text-gray-400">
                  Loading submissions...
                </span>
              </div>
            </div>
          }
        >
          <SubmissionsDisplay cik={cikNumber} />
        </Suspense>
      </main>
    </div>
  );
}
