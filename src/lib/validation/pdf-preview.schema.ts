import { z } from 'zod';

// URL validation schema with strict requirements
export const urlSchema = z
  .string()
  .url({ message: 'Invalid URL format' })
  .refine((url) => url.startsWith('https://'), {
    message: 'Only HTTPS URLs are allowed',
  })
  .refine((url) => {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Block localhost variants
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return false;
    }

    // Block private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const [, a, b] = match.map(Number);
      if (a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
        return false;
      }
    }

    // Block cloud metadata endpoints
    const blockedHosts = [
      '169.254.169.254', // AWS, Azure, GCP metadata
      'metadata.google.internal',
      '169.254.169.253', // AWS VPC DNS
    ];

    return !blockedHosts.includes(hostname);
  }, {
    message: 'URL points to a blocked or private network resource',
  });

// Date validation - ISO 8601 format or YYYY-MM-DD
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/, {
    message: 'Date must be in ISO 8601 format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss)',
  })
  .optional();

// Company name validation
export const companyNameSchema = z
  .string()
  .max(200, { message: 'Company name too long' })
  .regex(/^[a-zA-Z0-9\s.,&'-]+$/, {
    message: 'Company name contains invalid characters',
  })
  .optional();

// Description validation
export const descriptionSchema = z
  .string()
  .max(500, { message: 'Description too long' })
  .regex(/^[a-zA-Z0-9\s.,&'():/-]+$/, {
    message: 'Description contains invalid characters',
  })
  .optional();

// Complete query parameters schema
export const pdfPreviewQuerySchema = z.object({
  url: urlSchema,
  company: companyNameSchema,
  date: dateSchema,
  description: descriptionSchema,
});

// Export inferred TypeScript type
export type PdfPreviewQuery = z.infer<typeof pdfPreviewQuerySchema>;
