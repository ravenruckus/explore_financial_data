import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// Helper to find Chrome executable for local development
function findChromeExecutable(): string | null {
  const platform = process.platform;
  
  if (platform === 'darwin') {
    // macOS
    const chromePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    ];
    for (const path of chromePaths) {
      if (existsSync(path)) {
        return path;
      }
    }
  } else if (platform === 'linux') {
    // Linux
    try {
      const chromePath = execSync('which google-chrome-stable || which google-chrome || which chromium-browser', { encoding: 'utf-8' }).trim();
      if (chromePath) return chromePath;
    } catch (e) {
      // Chrome not found in PATH
    }
  } else if (platform === 'win32') {
    // Windows
    const chromePaths = [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const path of chromePaths) {
      if (existsSync(path)) {
        return path;
      }
    }
  }
  
  return null;
}

// Helper function to sanitize filename - remove invalid characters
function sanitizeFilename(str: string): string {
  // Remove or replace invalid filename characters
  return str
    .replace(/[<>:"/\\|?*]/g, '-') // Replace invalid chars with dash
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 100); // Limit length
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const documentUrl = searchParams.get('url');
  const companyName = searchParams.get('company') || '';
  const date = searchParams.get('date') || '';
  const description = searchParams.get('description') || '';

  if (!documentUrl) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  let browser = null;

  try {
    // Fetch the HTML document from SEC
    const htmlResponse = await fetch(documentUrl, {
      headers: {
        'User-Agent': 'Company Search App contact@example.com',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!htmlResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch document: ${htmlResponse.statusText}` },
        { status: htmlResponse.status }
      );
    }

    const htmlContent = await htmlResponse.text();

    // Determine which executable to use based on environment
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    let executablePath: string | undefined;
    let launchArgs: string[];
    let headless: boolean;

    if (isProduction) {
      // Use @sparticuz/chromium for production/serverless
      executablePath = await chromium.executablePath();
      launchArgs = chromium.args;
      headless = chromium.headless;
    } else {
      // For local development, try to use system Chrome
      const chromePath = findChromeExecutable();
      if (chromePath) {
        executablePath = chromePath;
        launchArgs = ['--no-sandbox', '--disable-setuid-sandbox'];
        headless = true;
      } else {
        // Fallback to chromium if Chrome not found
        executablePath = await chromium.executablePath();
        launchArgs = chromium.args;
        headless = chromium.headless;
      }
    }

    // Launch browser
    browser = await puppeteer.launch({
      args: launchArgs,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless,
    });

    const page = await browser.newPage();

    // Set content and wait for it to load
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    });

    await browser.close();

    // Build filename from company name, date, and description
    let filename = 'document';
    const filenameParts: string[] = [];
    
    if (companyName) {
      filenameParts.push(sanitizeFilename(companyName));
    }
    if (date) {
      // Use just the date part (YYYY-MM-DD) if there's time component
      const datePart = date.split('T')[0].split(' ')[0];
      filenameParts.push(datePart);
    }
    if (description) {
      filenameParts.push(sanitizeFilename(description));
    }
    
    if (filenameParts.length > 0) {
      filename = filenameParts.join('_');
    }
    
    // Ensure it ends with .pdf
    if (!filename.endsWith('.pdf')) {
      filename += '.pdf';
    }

    // Return PDF with inline disposition for browser preview
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    
    if (browser) {
      await browser.close();
    }

    return NextResponse.json(
      { error: 'Failed to generate PDF preview' },
      { status: 500 }
    );
  }
}

