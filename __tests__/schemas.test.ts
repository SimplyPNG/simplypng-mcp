import {
  estimateCreditsInput,
  removeBackgroundInput,
  batchRemoveBackgroundInput,
  getJobStatusInput,
  downloadResultsInput,
} from '../src/schemas.js';

describe('estimateCreditsInput', () => {
  it('accepts valid imageCount', () => {
    const result = estimateCreditsInput.safeParse({ imageCount: 5 });
    expect(result.success).toBe(true);
  });

  it('accepts imageCount at max boundary (50)', () => {
    const result = estimateCreditsInput.safeParse({ imageCount: 50 });
    expect(result.success).toBe(true);
  });

  it('accepts imageCount at min boundary (1)', () => {
    const result = estimateCreditsInput.safeParse({ imageCount: 1 });
    expect(result.success).toBe(true);
  });

  it('rejects imageCount = 0 (below min)', () => {
    const result = estimateCreditsInput.safeParse({ imageCount: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects imageCount = 51 (above max)', () => {
    const result = estimateCreditsInput.safeParse({ imageCount: 51 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer imageCount', () => {
    const result = estimateCreditsInput.safeParse({ imageCount: 1.5 });
    expect(result.success).toBe(false);
  });

  it('accepts hdMode: true', () => {
    const result = estimateCreditsInput.safeParse({ imageCount: 1, hdMode: true });
    expect(result.success).toBe(true);
  });

  it('accepts missing hdMode (optional)', () => {
    const result = estimateCreditsInput.safeParse({ imageCount: 1 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.hdMode).toBeUndefined();
  });

  it('rejects missing imageCount', () => {
    const result = estimateCreditsInput.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('removeBackgroundInput', () => {
  it('accepts minimal valid input (image only)', () => {
    const result = removeBackgroundInput.safeParse({ image: 'https://example.com/image.jpg' });
    expect(result.success).toBe(true);
  });

  it('accepts all valid optional fields', () => {
    const result = removeBackgroundInput.safeParse({
      image: 'data:image/png;base64,abc123',
      outputMode: 'download_url',
      hdMode: false,
      outputType: 'centered',
      background: 'white',
      backgroundColor: '#FFFFFF',
      outputFormat: 'jpg',
      idempotencyKey: 'key-123',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid outputMode', () => {
    const result = removeBackgroundInput.safeParse({ image: 'test', outputMode: 'stream' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid background value', () => {
    const result = removeBackgroundInput.safeParse({ image: 'test', background: 'blue' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid outputFormat', () => {
    const result = removeBackgroundInput.safeParse({ image: 'test', outputFormat: 'webp' });
    expect(result.success).toBe(false);
  });

  it('rejects missing image', () => {
    const result = removeBackgroundInput.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('batchRemoveBackgroundInput', () => {
  it('accepts single image', () => {
    const result = batchRemoveBackgroundInput.safeParse({
      images: [{ url: 'https://example.com/a.jpg' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts exactly 50 images (max)', () => {
    const images = Array.from({ length: 50 }, (_, i) => ({ url: `https://example.com/${i}.jpg` }));
    const result = batchRemoveBackgroundInput.safeParse({ images });
    expect(result.success).toBe(true);
  });

  it('rejects 51 images (above max)', () => {
    const images = Array.from({ length: 51 }, (_, i) => ({ url: `https://example.com/${i}.jpg` }));
    const result = batchRemoveBackgroundInput.safeParse({ images });
    expect(result.success).toBe(false);
  });

  it('rejects empty images array (below min)', () => {
    const result = batchRemoveBackgroundInput.safeParse({ images: [] });
    expect(result.success).toBe(false);
  });

  it('rejects invalid webhookUrl (not a URL)', () => {
    const result = batchRemoveBackgroundInput.safeParse({
      images: [{ url: 'https://example.com/a.jpg' }],
      webhookUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid webhookUrl', () => {
    const result = batchRemoveBackgroundInput.safeParse({
      images: [{ url: 'https://example.com/a.jpg' }],
      webhookUrl: 'https://mysite.com/webhook',
    });
    expect(result.success).toBe(true);
  });

  it('accepts image with all optional fields', () => {
    const result = batchRemoveBackgroundInput.safeParse({
      images: [{ url: 'https://example.com/a.jpg', base64: 'abc', id: 'img-1' }],
    });
    expect(result.success).toBe(true);
  });
});

describe('getJobStatusInput', () => {
  it('accepts jobId only', () => {
    const result = getJobStatusInput.safeParse({ jobId: 'job_abc123' });
    expect(result.success).toBe(true);
  });

  it('accepts batchId only', () => {
    const result = getJobStatusInput.safeParse({ batchId: 'batch_xyz' });
    expect(result.success).toBe(true);
  });

  it('accepts both jobId and batchId', () => {
    const result = getJobStatusInput.safeParse({ jobId: 'job_1', batchId: 'batch_1' });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (both optional — runtime validation handles the requirement)', () => {
    const result = getJobStatusInput.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe('downloadResultsInput', () => {
  it('accepts valid jobId', () => {
    const result = downloadResultsInput.safeParse({ jobId: 'job_abc123' });
    expect(result.success).toBe(true);
  });

  it('rejects missing jobId', () => {
    const result = downloadResultsInput.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-string jobId', () => {
    const result = downloadResultsInput.safeParse({ jobId: 123 });
    expect(result.success).toBe(false);
  });
});
