import { z } from 'zod';

export const estimateCreditsInput = z.object({
  imageCount: z.number().int().min(1).max(50).describe('Number of images to process'),
  hdMode: z.boolean().optional().describe('Use HD mode (4096px, 2 credits/image). Default: false'),
});

export const removeBackgroundInput = z.object({
  image: z.string().describe('Base64-encoded image OR an https:// URL pointing to the image'),
  outputMode: z.enum(['download_url', 'base64_json']).optional()
    .describe('Output format. download_url returns a signed URL; base64_json returns raw base64 data. Default: download_url'),
  hdMode: z.boolean().optional().describe('Use HD mode (4096px, 2 credits). Default: false (2500px, 1 credit)'),
  outputType: z.enum(['original', 'centered']).optional()
    .describe('original: keep original crop. centered: center subject on square canvas. Default: original'),
  background: z.enum(['transparent', 'white', 'custom']).optional()
    .describe('Background fill. transparent requires PNG output. Default: transparent'),
  backgroundColor: z.string().optional().describe('Hex color for custom background, e.g. #FF5733'),
  outputFormat: z.enum(['png', 'jpg']).optional().describe('Output file format. Default: png'),
  idempotencyKey: z.string().optional().describe('Optional idempotency key to prevent duplicate jobs'),
});

export const batchRemoveBackgroundInput = z.object({
  images: z.array(z.object({
    url: z.string().optional().describe('HTTPS URL of the image'),
    base64: z.string().optional().describe('Base64-encoded image data'),
    id: z.string().optional().describe('Your own identifier for this image (returned in results)'),
  })).min(1).max(50).describe('Array of images to process (max 50)'),
  webhookUrl: z.string().url().optional()
    .describe('HTTPS URL to receive a POST callback when the batch completes'),
  hdMode: z.boolean().optional().describe('Use HD mode for all images (2 credits/image). Default: false'),
  outputType: z.enum(['original', 'centered']).optional().describe('Output type for all images'),
  background: z.enum(['transparent', 'white', 'custom']).optional(),
  backgroundColor: z.string().optional(),
  outputFormat: z.enum(['png', 'jpg']).optional(),
  idempotencyKey: z.string().optional().describe('Optional idempotency key to prevent duplicate batches'),
});

export const getJobStatusInput = z.object({
  jobId: z.string().optional().describe('Single job ID returned by remove_background'),
  batchId: z.string().optional().describe('Batch ID returned by batch_remove_background'),
});

export const downloadResultsInput = z.object({
  jobId: z.string().describe('Job ID to retrieve download URL for'),
});
