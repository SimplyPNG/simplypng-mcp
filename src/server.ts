import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiFetch, getApiConfig } from './config.js';

export const server = new McpServer({
  name: 'simplypng-mcp',
  version: '0.1.0',
});

server.tool(
  'estimate_credits',
  'Estimate how many credits are needed and check if your balance is sufficient. ' +
  'Standard mode: 1 credit/image (2500px max). HD mode: 2 credits/image (4096px max).',
  {
    imageCount: z.number().int().min(1).max(50).describe('Number of images to process'),
    hdMode: z.boolean().optional().describe('Use HD mode (4096px, 2 credits/image). Default: false'),
  },
  async ({ imageCount, hdMode }) => {
    const config = getApiConfig();
    const creditsPerImage = hdMode ? 2 : 1;
    const estimated = imageCount * creditsPerImage;

    const res = await apiFetch('/api/v1/credits', config);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      const msg = (err['error'] as Record<string, unknown>)?.['message'] ?? res.statusText;
      throw new Error(`Failed to fetch credit balance: ${msg}`);
    }
    const data = await res.json() as Record<string, unknown>;
    const balance = data['balance'] as Record<string, number> | undefined;
    const available = balance?.['available'] ?? 0;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          estimatedCredits: estimated,
          currentBalance: available,
          canAfford: available >= estimated,
          breakdown: {
            imageCount,
            creditsPerImage,
            mode: hdMode ? 'HD (4096px max, 2 credits/image)' : 'Fast (2500px max, 1 credit/image)',
          },
        }, null, 2),
      }],
    };
  }
);

server.tool(
  'remove_background',
  'Remove the background from a single image. Accepts base64-encoded image data or an HTTPS URL. ' +
  'Returns a signed download URL (expires in 1 hour) or base64 result.',
  {
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
  },
  async ({ image, outputMode, hdMode, outputType, background, backgroundColor, outputFormat, idempotencyKey }) => {
    const config = getApiConfig();
    const body: Record<string, unknown> = {
      image,
      output_mode: outputMode ?? 'download_url',
      ...(idempotencyKey && { idempotency_key: idempotencyKey }),
      options: {
        ...(hdMode !== undefined && { hd_mode: hdMode }),
        ...(outputType && { output_type: outputType }),
        ...(background && { background }),
        ...(backgroundColor && { background_color: backgroundColor }),
        ...(outputFormat && { output_format: outputFormat }),
      },
    };

    const res = await apiFetch('/api/v1/jobs', config, { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      const msg = (err['error'] as Record<string, unknown>)?.['message'] ?? res.statusText;
      throw new Error(`Failed to create job: ${msg}`);
    }
    const data = await res.json() as Record<string, unknown>;

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  'batch_remove_background',
  'Remove backgrounds from multiple images in a single batch (up to 50). ' +
  'Provide a webhook URL to be notified when the batch completes, or poll with get_job_status.',
  {
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
  },
  async ({ images, webhookUrl, hdMode, outputType, background, backgroundColor, outputFormat, idempotencyKey }) => {
    const config = getApiConfig();
    const body: Record<string, unknown> = {
      images,
      ...(webhookUrl && { webhook_url: webhookUrl }),
      ...(idempotencyKey && { idempotency_key: idempotencyKey }),
      options: {
        ...(hdMode !== undefined && { hd_mode: hdMode }),
        ...(outputType && { output_type: outputType }),
        ...(background && { background }),
        ...(backgroundColor && { background_color: backgroundColor }),
        ...(outputFormat && { output_format: outputFormat }),
      },
    };

    const res = await apiFetch('/api/v1/jobs/batch', config, { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      const msg = (err['error'] as Record<string, unknown>)?.['message'] ?? res.statusText;
      throw new Error(`Failed to create batch: ${msg}`);
    }
    const data = await res.json() as Record<string, unknown>;

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  'get_job_status',
  'Check the status of a single job or batch. Returns status (pending/processing/succeeded/failed) ' +
  'and result URLs for completed jobs.',
  {
    jobId: z.string().optional().describe('Single job ID returned by remove_background'),
    batchId: z.string().optional().describe('Batch ID returned by batch_remove_background'),
  },
  async ({ jobId, batchId }) => {
    if (!jobId && !batchId) {
      throw new Error('Either jobId or batchId is required');
    }
    const config = getApiConfig();
    const path = batchId ? `/api/v1/jobs/batch/${batchId}` : `/api/v1/jobs/${jobId}`;

    const res = await apiFetch(path, config);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      const msg = (err['error'] as Record<string, unknown>)?.['message'] ?? res.statusText;
      throw new Error(`Failed to get job status: ${msg}`);
    }
    const data = await res.json() as Record<string, unknown>;

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.tool(
  'download_results',
  'Get the current signed download URL for a completed job. ' +
  'URLs expire after 1 hour — call this tool again if the URL has expired.',
  {
    jobId: z.string().describe('Job ID to retrieve download URL for'),
  },
  async ({ jobId }) => {
    const config = getApiConfig();
    const res = await apiFetch(`/api/v1/jobs/${jobId}?output_mode=download_url`, config);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      const msg = (err['error'] as Record<string, unknown>)?.['message'] ?? res.statusText;
      throw new Error(`Failed to get download URL: ${msg}`);
    }
    const data = await res.json() as Record<string, unknown>;
    const job = data['job'] as Record<string, unknown> | undefined;
    const result = job?.['result'] as Record<string, unknown> | undefined;

    if (!result) {
      throw new Error(`Job ${jobId} has no result yet. Check status with get_job_status first.`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify({
        jobId,
        downloadUrl: result['url'],
        thumbnailUrl: result['thumbnail_url'] ?? null,
        expiresAt: result['expires_at'],
      }, null, 2) }],
    };
  }
);
