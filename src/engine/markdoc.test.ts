import { describe, expect, it } from 'vitest';
import { extractMarkdocText, truncateMarkdocNodes } from './markdoc';
import type { MarkdocContent } from './schema';

describe('truncateMarkdocNodes', () => {
  it('returns a single-word string unchanged with no ellipsis when it fits', () => {
    const content: MarkdocContent = 'Hello';
    const result = truncateMarkdocNodes(content, 10);
    expect(extractMarkdocText(result)).toBe('Hello');
    expect(extractMarkdocText(result)).not.toContain('…');
  });

  it('cuts a multi-word string at a word boundary instead of mid-word', () => {
    // "Hello world" limit 8 → hardCut=7, lookbackStart=floor(7*0.8)=5
    // space at index 5 is within [5,7] → cut at 5, giving "Hello…"
    const content: MarkdocContent = 'Hello world';
    const result = truncateMarkdocNodes(content, 8);
    const text = extractMarkdocText(result);
    // Should cut at word boundary (space at index 5), giving "Hello…"
    expect(text).toBe('Hello…');
    // The part before … should be a complete word (no trailing partial word)
    const beforeEllipsis = text.replace(/…$/, '');
    expect(beforeEllipsis.trim()).toBe('Hello');
  });

  it('cuts at hard boundary when no word boundary is within the last 20%', () => {
    // "abcdefghij" (no spaces) limit 5 → no word boundary, hard cut
    const content: MarkdocContent = 'abcdefghij';
    const result = truncateMarkdocNodes(content, 5);
    const text = extractMarkdocText(result);
    expect(text).toContain('…');
    expect(text.length).toBeLessThan('abcdefghij'.length);
  });

  it('truncates InlineCode tag content at a word boundary', () => {
    const content: MarkdocContent = {
      name: 'InlineCode',
      attributes: { content: 'Hello world' },
    };
    const result = truncateMarkdocNodes(content, 8);
    const text = extractMarkdocText(result);
    // Should cut at word boundary
    expect(text).toBe('Hello…');
  });

  it('returns content unchanged when it is shorter than the limit', () => {
    const content: MarkdocContent = 'Short';
    const result = truncateMarkdocNodes(content, 100);
    expect(extractMarkdocText(result)).toBe('Short');
    expect(extractMarkdocText(result)).not.toContain('…');
  });

  it('returns an empty array for empty content', () => {
    const result = truncateMarkdocNodes([], 50);
    expect(result).toEqual([]);
  });

  it('appends ellipsis only when text was actually shortened', () => {
    // Exact fit — no ellipsis
    const exact: MarkdocContent = 'Hello';
    const exactResult = truncateMarkdocNodes(exact, 5);
    expect(extractMarkdocText(exactResult)).toBe('Hello');

    // Over limit — ellipsis
    const over: MarkdocContent = 'Hello world';
    const overResult = truncateMarkdocNodes(over, 5);
    expect(extractMarkdocText(overResult)).toContain('…');
  });
});
