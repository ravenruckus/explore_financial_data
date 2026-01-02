import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// Security imports
import { pdfPreviewQuerySchema } from '@/lib/validation/pdf-preview.schema';
import {
  validateAllowedDomain,
  validateContentType,
  validateContentSize,
  SSRFProtectionError
} from '@/lib/security/ssrf-protection';
import { rateLimiter, getClientIP } from '@/lib/security/rate-limiter';
import { getSecurityConfig } from '@/lib/config/security.config';

// Cache PDFs for 1 hour (3600 seconds)
export const revalidate = 3600;

// Route segment config for larger responses
export const runtime = 'nodejs'; // Use Node.js runtime for puppeteer
export const maxDuration = 60; // Maximum execution time (60 seconds for Vercel Pro)

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
  const clientIP = getClientIP(request);
  const config = getSecurityConfig();
  let browser = null;

  try {
    // Step 1: Rate Limiting
    const rateLimitResult = rateLimiter.check(clientIP);

    if (!rateLimitResult.allowed) {
      const resetDate = new Date(rateLimitResult.resetTime);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded. Please try again later.',
          resetTime: resetDate.toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': config.rateLimitMaxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetDate.toISOString(),
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Step 2: Input Validation with Zod
    const searchParams = request.nextUrl.searchParams;
    const validationResult = pdfPreviewQuerySchema.safeParse({
      url: searchParams.get('url'),
      company: searchParams.get('company'),
      date: searchParams.get('date'),
      description: searchParams.get('description'),
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request parameters',
          details: validationResult.error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    const { url: documentUrl, company: companyName, date, description } = validationResult.data;

    // Step 3: SSRF Protection - Domain Allowlist
    try {
      validateAllowedDomain(documentUrl);
    } catch (error) {
      if (error instanceof SSRFProtectionError) {
        console.warn(`SSRF protection blocked request from ${clientIP} to ${documentUrl}`);
        return NextResponse.json(
          { error: 'Domain not allowed for PDF generation' },
          { status: 403 }
        );
      }
      throw error;
    }

    // Step 4: Fetch HTML with Content Validation and Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.fetchTimeoutMs);

    let htmlResponse;
    try {
      htmlResponse = await fetch(documentUrl, {
        headers: {
          'User-Agent': 'Company Search App contact@example.com',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout while fetching document' },
          { status: 504 }
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!htmlResponse.ok) {
      console.error(`Failed to fetch document: ${htmlResponse.status} ${htmlResponse.statusText}`);
      return NextResponse.json(
        { error: 'Failed to fetch document from source' },
        { status: 502 }
      );
    }

    // Step 5: Validate Content-Type
    try {
      validateContentType(htmlResponse.headers.get('content-type'));
    } catch (error) {
      console.warn(`Invalid content type from ${documentUrl}: ${error}`);
      return NextResponse.json(
        { error: 'Document is not in a supported format' },
        { status: 415 }
      );
    }

    // Step 6: Validate Content Size
    const contentLength = htmlResponse.headers.get('content-length');
    if (contentLength) {
      try {
        validateContentSize(parseInt(contentLength, 10));
      } catch (error) {
        console.warn(`Content too large from ${documentUrl}: ${contentLength} bytes`);
        return NextResponse.json(
          { error: 'Document is too large to process' },
          { status: 413 }
        );
      }
    }

    // Fetch content
    const htmlContent = await htmlResponse.text();

    // Additional size check after fetching
    try {
      validateContentSize(htmlContent.length);
    } catch (error) {
      console.warn(`Content too large after fetch: ${htmlContent.length} bytes`);
      return NextResponse.json(
        { error: 'Document is too large to process' },
        { status: 413 }
      );
    }

    // Step 7: PDF Generation
    // Determine which executable to use based on environment
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL;
    let executablePath: string | undefined;
    let launchArgs: string[];
    let headless: boolean | 'shell' | string;

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
      headless: headless === 'shell' ? 'shell' : Boolean(headless),
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
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'X-RateLimit-Limit': config.rateLimitMaxRequests.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (error) {
    // Enhanced error handling with logging but generic user messages
    console.error('Error generating PDF:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      clientIP,
      timestamp: new Date().toISOString(),
    });

    if (browser) {
      await browser.close();
    }

    return NextResponse.json(
      { error: 'An error occurred while generating the PDF preview' },
      { status: 500 }
    );
  }
}

