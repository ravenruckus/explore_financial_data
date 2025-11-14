import { NextRequest, NextResponse } from 'next/server';

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
  const url = `https://data.sec.gov/submissions/CIK${formattedCik}.json`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Company Search App contact@example.com',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Company submissions not found for this CIK' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `SEC API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    // console.log('data', data);    
    // console.log('data2', data['filings']);
    // console.log('data3', data['filings']['recent']);
    // console.log('data4', data['filings']['recent']['form']);
    // console.log('data5', data['filings']['recent']['filingDate']);
    // console.log('data6', data['filings']['recent']['reportDate']);
    // console.log('data7', data['filings']['recent']['primaryDocDescription']);
    // console.log('data8', data['filings']['recent']['primaryDocument']);
    // console.log('data9', data['filings']['recent']['isXBRL']);
    // console.log('data10', data['filings']['recent']['isInlineXBRL']);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching SEC submissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SEC submissions' },
      { status: 500 }
    );
  }
}

