import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { measureTextLines } from './text-measure';

describe('measureTextLines', () => {
  it('falls back to character-budget estimate when document is undefined', () => {
    // Simulate server-side environment
    const originalDocument = globalThis.document;
    // @ts-expect-error — intentionally removing document for SSR simulation
    delete globalThis.document;

    try {
      // widthPx=100, fontSizePx=10 → charsPerLine = floor(100 / 6) = 16
      // "hello world foo bar" = 19 chars → ceil(19/16) = 2
      const result = measureTextLines('hello world foo bar', 100, 10);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(typeof result).toBe('number');
    } finally {
      globalThis.document = originalDocument;
    }
  });

  it('returns 1 for a short text that fits on one line', () => {
    // Mock canvas context
    const mockMeasureText = vi.fn((text: string) => ({ width: text.length * 5 }));
    const mockGetContext = vi.fn(() => ({
      font: '',
      measureText: mockMeasureText,
    }));
    const mockCreateElement = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return { getContext: mockGetContext } as unknown as HTMLCanvasElement;
      }
      return document.createElement(tag);
    });

    try {
      // "Hi" = 2 chars × 5px = 10px, widthPx = 200 → fits on 1 line
      const result = measureTextLines('Hi', 200, 13);
      expect(result).toBe(1);
    } finally {
      mockCreateElement.mockRestore();
    }
  });

  it('returns multiple lines when text overflows the width', () => {
    // Each word is 20px wide, container is 50px → wraps after ~2 words
    const mockMeasureText = vi.fn((text: string) => ({
      width: text.split(' ').length * 20,
    }));
    const mockGetContext = vi.fn(() => ({
      font: '',
      measureText: mockMeasureText,
    }));
    const mockCreateElement = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return { getContext: mockGetContext } as unknown as HTMLCanvasElement;
      }
      return document.createElement(tag);
    });

    try {
      // "word1 word2 word3 word4" — each word adds 20px, container 50px
      // line 1: "word1 word2" = 40px fits, "word1 word2 word3" = 60px > 50 → wrap
      // line 2: "word3 word4" = 40px fits
      const result = measureTextLines('word1 word2 word3 word4', 50, 13);
      expect(result).toBeGreaterThan(1);
    } finally {
      mockCreateElement.mockRestore();
    }
  });

  it('falls back to character-budget when getContext returns null', () => {
    const mockGetContext = vi.fn(() => null);
    const mockCreateElement = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') {
        return { getContext: mockGetContext } as unknown as HTMLCanvasElement;
      }
      return document.createElement(tag);
    });

    try {
      const result = measureTextLines('hello world', 100, 10);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(1);
    } finally {
      mockCreateElement.mockRestore();
    }
  });
});
