import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiFetch, getApiConfig, extractErrorMessage } from './config.js';
import {
  estimateCreditsInput,
  removeBackgroundInput,
  batchRemoveBackgroundInput,
  getJobStatusInput,
  downloadResultsInput,
} from './schemas.js';

export const server = new McpServer({
  name: 'simplypng-mcp',
  version: '0.1.0',
});

server.registerTool(
  'estimate_credits',
  {
    title: 'Estimate Credits',
    description:
      'Estimate how many credits are needed and check if your balance is sufficient. ' +
      'Standard mode: 1 credit/image (2500px max). HD mode: 2 credits/image (4096px max).',
    inputSchema: estimateCreditsInput,
  },
  async ({ imageCount, hdMode }) => {
    const config = getApiConfig();
    const creditsPerImage = hdMode ? 2 : 1;
    const estimated = imageCount * creditsPerImage;

    const res = await apiFetch('/api/v1/credits', config);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(`Failed to fetch credit balance: ${extractErrorMessage(err, res.statusText)}`);
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

server.registerTool(
  'remove_background',
  {
    title: 'Remove Background',
    description:
      'Remove the background from a single image. Accepts base64-encoded image data or an HTTPS URL. ' +
      'Returns a job ID — poll with get_job_status until succeeded, then call download_results.',
    inputSchema: removeBackgroundInput,
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
      throw new Error(`Failed to create job: ${extractErrorMessage(err, res.statusText)}`);
    }
    const data = await res.json() as Record<string, unknown>;

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.registerTool(
  'batch_remove_background',
  {
    title: 'Batch Remove Background',
    description:
      'Remove backgrounds from multiple images in a single batch (up to 50). ' +
      'Returns a batchId — poll with get_job_status or provide a webhookUrl for completion notification.',
    inputSchema: batchRemoveBackgroundInput,
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
      throw new Error(`Failed to create batch: ${extractErrorMessage(err, res.statusText)}`);
    }
    const data = await res.json() as Record<string, unknown>;

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.registerTool(
  'get_job_status',
  {
    title: 'Get Job Status',
    description:
      'Check the status of a single job or batch. Returns status (pending/processing/succeeded/failed) ' +
      'and result URLs for completed jobs. Poll every 2–5 seconds until status is succeeded or failed.',
    inputSchema: getJobStatusInput,
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
      throw new Error(`Failed to get job status: ${extractErrorMessage(err, res.statusText)}`);
    }
    const data = await res.json() as Record<string, unknown>;

    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  }
);

server.registerTool(
  'download_results',
  {
    title: 'Download Results',
    description:
      'Get the current signed download URL for a completed job. ' +
      'URLs expire after 1 hour — call this tool again if the URL has expired.',
    inputSchema: downloadResultsInput,
  },
  async ({ jobId }) => {
    const config = getApiConfig();
    const res = await apiFetch(`/api/v1/jobs/${jobId}?output_mode=download_url`, config);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as Record<string, unknown>;
      throw new Error(`Failed to get download URL: ${extractErrorMessage(err, res.statusText)}`);
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

// ─── Resources (Presets) ──────────────────────────────────────────────────────

server.registerResource(
  'amazon-main-image',
  'presets://marketplace/amazon-main-image',
  {
    title: 'Amazon Main Image Preset',
    description:
      'SimplyPNG options for Amazon main product images. ' +
      'Amazon requires pure white background (RGB 255,255,255), product centered and filling ≥85% of frame, ' +
      'minimum 1000px (2000px+ recommended). Source: sellercentral.amazon.com/help/hub/reference/G1881',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        name: 'Amazon Main Image',
        options: {
          output_type: 'centered',
          background: 'white',
          background_color: '#FFFFFF',
          canvas_size_preset: 'standard',
          output_format: 'jpg',
          jpeg_quality: 90,
        },
        credits_per_image: 1,
        notes: 'Amazon requires pure white (#FFFFFF) background. Product must fill ≥85% of image frame.',
      }, null, 2),
    }],
  })
);

server.registerResource(
  'shopify-thumbnail',
  'presets://marketplace/shopify-thumbnail',
  {
    title: 'Shopify Product Thumbnail Preset',
    description:
      'SimplyPNG options for Shopify product images. ' +
      'Shopify recommends 2048×2048px square images; PNG format for best quality. ' +
      'Source: help.shopify.com/en/manual/products/product-media/product-media-types',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        name: 'Shopify Product Thumbnail',
        options: {
          output_type: 'centered',
          background: 'white',
          background_color: '#FFFFFF',
          canvas_size_preset: 'standard',
          output_format: 'png',
        },
        credits_per_image: 1,
        notes: 'Shopify recommends square images. PNG format recommended by Shopify for product images.',
      }, null, 2),
    }],
  })
);

server.registerResource(
  'etsy-listing',
  'presets://marketplace/etsy-listing',
  {
    title: 'Etsy Listing Image Preset',
    description:
      'SimplyPNG options for Etsy listing images. ' +
      'Etsy recommends square images ≥2000px to display well in search results and on listing pages. ' +
      'Source: help.etsy.com/hc/en-us/articles/115015663347',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        name: 'Etsy Listing Image',
        options: {
          output_type: 'centered',
          background: 'white',
          background_color: '#FFFFFF',
          canvas_size_preset: 'standard',
          output_format: 'png',
        },
        credits_per_image: 1,
        notes: 'Etsy listing images should be square with enough border to allow thumbnail cropping.',
      }, null, 2),
    }],
  })
);

server.registerResource(
  'mode-fast',
  'presets://mode/fast',
  {
    title: 'Fast Mode Preset',
    description:
      'Standard processing: input resized to 2500px max before background removal. ' +
      '1 credit per image. Best for most use cases.',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        name: 'Fast Mode',
        options: { hd_mode: false },
        credits_per_image: 1,
        max_input_dimension: 2500,
        notes: 'Input images are resized to 2500px before processing. Faster and cheaper than HD.',
      }, null, 2),
    }],
  })
);

server.registerResource(
  'mode-hd',
  'presets://mode/hd',
  {
    title: 'HD Mode Preset',
    description:
      'High-definition processing: input preserved up to 4096px. ' +
      '2 credits per image. Best for large products or when fine edge detail matters.',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        name: 'HD Mode',
        options: { hd_mode: true },
        credits_per_image: 2,
        max_input_dimension: 4096,
        notes: 'Input images preserved up to 4096px. Use when fine detail or large canvas output is required.',
      }, null, 2),
    }],
  })
);

// ─── Workflow Prompts ─────────────────────────────────────────────────────────

server.registerPrompt(
  'amazon-main-image-pipeline',
  {
    title: 'Amazon Main Image Pipeline',
    description:
      'Full workflow to process a product image for Amazon: credit check → background removal with ' +
      'Amazon-compliant settings (white background, centered, 2000×2000, JPG) → poll for completion → download URL.',
    argsSchema: {
      imageUrl: z.string().url().describe('HTTPS URL of the product image to process'),
      imageCount: z.number().int().min(1).optional()
        .describe('Number of images to estimate credits for (default: 1)'),
    },
  },
  ({ imageUrl, imageCount }) => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Process this product image for Amazon using the following workflow:

Image URL: ${imageUrl}

Step 1 — Credit check:
Call estimate_credits with imageCount=${imageCount ?? 1} and hdMode=false.
If canAfford is false, stop and tell the user they need more credits.

Step 2 — Remove background:
Call remove_background with:
- image: "${imageUrl}"
- outputMode: "download_url"
- outputType: "centered"
- background: "white"
- backgroundColor: "#FFFFFF"
- outputFormat: "jpg"

Amazon requires pure white background (RGB 255,255,255) and the product must fill at least 85% of the frame.

Step 3 — Poll for completion:
Call get_job_status with the jobId from Step 2.
Repeat every 3 seconds until status is "succeeded" or "failed".
If "failed", report the error to the user.

Step 4 — Get download URL:
Call download_results with the jobId.
Return the downloadUrl and expiresAt to the user.`,
      },
    }],
  })
);

server.registerPrompt(
  'shopify-bulk-listing',
  {
    title: 'Shopify Bulk Listing Pipeline',
    description:
      'Bulk workflow to process multiple product images for Shopify: credit check → batch background ' +
      'removal (white background, centered, 2000×2000, PNG) → poll for batch completion → download URLs.',
    argsSchema: {
      imageUrls: z.array(z.string().url()).min(1).max(50)
        .describe('Array of HTTPS image URLs to process (max 50)'),
      webhookUrl: z.string().url().optional()
        .describe('Optional HTTPS URL to receive a POST callback when the batch completes'),
    },
  },
  ({ imageUrls, webhookUrl }) => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Process ${imageUrls.length} product image(s) for Shopify using the following workflow:

Image URLs:
${imageUrls.map((url: string, i: number) => `${i + 1}. ${url}`).join('\n')}
${webhookUrl ? `\nWebhook URL: ${webhookUrl}` : ''}

Step 1 — Credit check:
Call estimate_credits with imageCount=${imageUrls.length} and hdMode=false.
If canAfford is false, stop and tell the user they need more credits.

Step 2 — Submit batch:
Call batch_remove_background with:
- images: array of { url } objects for each image URL
- outputType: "centered"
- background: "white"
- backgroundColor: "#FFFFFF"
- outputFormat: "png"
${webhookUrl ? `- webhookUrl: "${webhookUrl}"` : ''}

Shopify recommends 2048×2048px square images. PNG format is preferred.

Step 3 — Poll for batch completion:
Call get_job_status with the batchId from Step 2.
Repeat every 5 seconds until status is "completed" or "failed".
Report progress to the user (e.g. "7/10 images done").

Step 4 — Collect results:
For each succeeded job in the batch response, extract the download URLs.
Return all download URLs to the user as a list.`,
      },
    }],
  })
);

server.registerPrompt(
  'etsy-listing-pipeline',
  {
    title: 'Etsy Listing Pipeline',
    description:
      'Full workflow to process a product image for Etsy: credit check → background removal with ' +
      'Etsy-recommended settings (white background, centered, 2000×2000, PNG) → poll for completion → download URL.',
    argsSchema: {
      imageUrl: z.string().url().describe('HTTPS URL of the product image to process'),
    },
  },
  ({ imageUrl }) => ({
    messages: [{
      role: 'user' as const,
      content: {
        type: 'text' as const,
        text: `Process this product image for Etsy using the following workflow:

Image URL: ${imageUrl}

Step 1 — Credit check:
Call estimate_credits with imageCount=1 and hdMode=false.
If canAfford is false, stop and tell the user they need more credits.

Step 2 — Remove background:
Call remove_background with:
- image: "${imageUrl}"
- outputMode: "download_url"
- outputType: "centered"
- background: "white"
- backgroundColor: "#FFFFFF"
- outputFormat: "png"

Etsy recommends square images of at least 2000px with enough border for thumbnail cropping.

Step 3 — Poll for completion:
Call get_job_status with the jobId from Step 2.
Repeat every 3 seconds until status is "succeeded" or "failed".
If "failed", report the error to the user.

Step 4 — Get download URL:
Call download_results with the jobId.
Return the downloadUrl and expiresAt to the user.`,
      },
    }],
  })
);
