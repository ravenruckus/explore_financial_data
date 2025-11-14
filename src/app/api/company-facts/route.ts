import { NextRequest, NextResponse } from 'next/server';

// Cache for 1 hour
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cik = searchParams.get('cik');

  if (!cik) {
    return NextResponse.json(
      { error: 'CIK parameter is required' },
      { status: 400 }
    );
  }

  // Format CIK with zero-padding to 10 digits
  const formattedCik = String(cik).padStart(10, '0');
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${formattedCik}.json`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Company Search App contact@example.com',
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Company facts not found for this CIK' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `SEC API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching SEC company facts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SEC company facts' },
      { status: 500 }
    );
  }
}

