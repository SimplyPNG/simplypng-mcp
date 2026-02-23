import { z } from 'zod';

export const estimateCreditsInput = z.object({
  imageCount: z.number().int().min(1).max(50).describe('Number of images to process'),
  hdMode: z.boolean().optional().describe(
    'Fast mode (default, 1 credit/image): input is resized to 2500px max before processing — OUTPUT is up to 2500px. '
    + 'Fast mode works with ANY input size (even 4000px images), but output resolution is capped at 2500px. '
    + 'HD mode (2 credits/image): input preserved up to 4096px — OUTPUT up to 4096px. '
    + 'Use HD ONLY when: (1) user explicitly requests HD/high-definition/4K output, '
    + 'or (2) user needs output resolution above 2500px, '
    + 'or (3) subject has fine edge detail like hair, fur, or feathers. '
    + 'Never default to HD without one of those reasons.'
  ),
});

export const removeBackgroundInput = z.object({
  image: z.string().describe(
    'HTTPS URL of the image (recommended) OR base64-encoded image data. '
    + 'URL: any publicly accessible https:// link — no size limit. '
    + 'Base64: data:image/png;base64,... or raw base64 string — server-side limit: 4MB per image. '
    + 'If the user has a local file and no URL: ask them to share a public URL or use the SimplyPNG web app at https://simplypng.app. '
    + 'Supported formats: JPEG, PNG, WebP, HEIC/HEIF.'
  ),
  outputMode: z.enum(['download_url', 'base64_json']).optional()
    .describe('Output format. download_url returns a signed URL; base64_json returns raw base64 data. Default: download_url'),
  hdMode: z.boolean().optional().describe(
    'Fast mode (default, 1 credit): input resized to 2500px max — OUTPUT capped at 2500px. Works with any input size. '
    + 'HD mode (2 credits): input preserved up to 4096px — OUTPUT up to 4096px. '
    + 'Use HD ONLY when: (1) user explicitly requests HD/high-definition/4K output, '
    + '(2) user needs output resolution above 2500px, '
    + 'or (3) subject has fine edge detail (hair, fur, feathers). '
    + 'Never use HD based on input size alone — Fast mode handles large inputs fine. Default: false.'
  ),
  outputType: z.enum(['original', 'centered']).optional()
    .describe('original: keep original crop. centered: center subject on square canvas. Default: original'),
  background: z.enum(['transparent', 'white', 'custom']).optional()
    .describe('Background fill. transparent requires PNG output. Default: transparent'),
  backgroundColor: z.string().optional().describe('Hex color for custom background, e.g. #FF5733'),
  outputFormat: z.enum(['png', 'jpg']).optional().describe('Output file format. Default: png'),
  refineEdges: z.boolean().optional().describe(
    'Enable edge color refinement to remove background color bleeding at subject edges. '
    + 'REQUIRES hdMode: true — the API will return an error if hdMode is false or omitted. '
    + 'No additional credit cost — included in HD mode (2 credits total). '
    + 'Recommend when: subject has complex edges against a strongly or evenly colored background (e.g. product on white/grey backdrop, portrait with solid background).'
  ),
  idempotencyKey: z.string().optional().describe('Optional idempotency key to prevent duplicate jobs'),
});

export const batchRemoveBackgroundInput = z.object({
  images: z.array(z.object({
    url: z.string().optional().describe('HTTPS URL of the image (recommended for files > 1MB)'),
    base64: z.string().optional().describe('Base64-encoded image data — server-side limit: 4MB decoded per image. For larger files use url instead.'),
    id: z.string().optional().describe('Your own identifier for this image (returned in results)'),
  })).min(1).max(50).describe('Array of images to process (max 50)'),
  webhookUrl: z.string().url().optional()
    .describe('HTTPS URL to receive a POST callback when the batch completes'),
  hdMode: z.boolean().optional().describe(
    'Fast mode (default, 1 credit/image): input resized to 2500px max — OUTPUT capped at 2500px. Works with any input size. '
    + 'HD mode (2 credits/image): input preserved up to 4096px — OUTPUT up to 4096px. '
    + 'Use HD ONLY when: (1) user explicitly requests HD/high-definition/4K output, '
    + '(2) user needs output above 2500px, or (3) subjects have fine detail like hair/fur/feathers. '
    + 'Default: false. Never upgrade to HD on your own initiative.'
  ),
  outputType: z.enum(['original', 'centered']).optional().describe('Output type for all images'),
  background: z.enum(['transparent', 'white', 'custom']).optional(),
  backgroundColor: z.string().optional(),
  outputFormat: z.enum(['png', 'jpg']).optional(),
  refineEdges: z.boolean().optional().describe(
    'Enable edge color refinement for all images. REQUIRES hdMode: true. No extra credit cost. '
    + 'Recommend when subjects have complex edges against strongly colored backgrounds.'
  ),
  idempotencyKey: z.string().optional().describe('Optional idempotency key to prevent duplicate batches'),
});

export const getJobStatusInput = z.object({
  jobId: z.string().optional().describe('Single job ID returned by remove_background'),
  batchId: z.string().optional().describe('Batch ID returned by batch_remove_background'),
});

export const downloadResultsInput = z.object({
  jobId: z.string().describe('Job ID to retrieve download URL for'),
});
