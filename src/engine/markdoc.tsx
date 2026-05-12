import type { ReactNode } from 'react';
import type { MarkdocContent, MarkdocNode, MarkdocTag } from './schema';

function isMarkdocTag(value: unknown): value is MarkdocTag {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.name !== 'string') {
    return false;
  }

  if (
    candidate.attributes !== undefined &&
    (typeof candidate.attributes !== 'object' || candidate.attributes === null || Array.isArray(candidate.attributes))
  ) {
    return false;
  }

  if (candidate.children !== undefined && !Array.isArray(candidate.children)) {
    return false;
  }

  if (!Array.isArray(candidate.children)) {
    return true;
  }

  return candidate.children.every((child) => isMarkdocNodeValue(child));
}

export function isMarkdocNodeValue(value: unknown): value is MarkdocNode {
  return typeof value === 'string' || isMarkdocTag(value);
}

export function isMarkdocContentValue(value: unknown): value is MarkdocContent {
  return isMarkdocNodeValue(value) || (Array.isArray(value) && value.every((item) => isMarkdocNodeValue(item)));
}

export function normalizeMarkdocNodes(
  content: MarkdocContent | null | undefined,
): MarkdocNode[] {
  if (content === null || content === undefined) {
    return [];
  }

  return Array.isArray(content) ? content : [content];
}

function renderChildren(content: MarkdocContent | undefined, keyPrefix: string) {
  return normalizeMarkdocNodes(content).map((child, index) => {
    return renderMarkdocNode(child, `${keyPrefix}-${index}`);
  });
}

export function renderMarkdocNode(node: MarkdocNode, key: string): ReactNode {
  if (typeof node === 'string') {
    return node;
  }

  return renderMarkdocTag(node, key);
}

export function renderMarkdocTag(tag: MarkdocTag, key: string): ReactNode {
  switch (tag.name) {
    case 'Paragraph':
      return <p key={key}>{renderChildren(tag.children, key)}</p>;
    case 'InlineCode':
      return <code key={key}>{String(tag.attributes?.content ?? '')}</code>;
    case 'Glossary':
      return (
        <em key={key} className="markdoc-glossary">
          {renderChildren(tag.children, key)}
        </em>
      );
    case 'Strong':
    case 'strong':
      return <strong key={key}>{renderChildren(tag.children, key)}</strong>;
    case 'Emphasis':
    case 'em':
      return <em key={key}>{renderChildren(tag.children, key)}</em>;
    case 'Link': {
      const href =
        typeof tag.attributes?.href === 'string' ? tag.attributes.href : '#';

      return (
        <a
          key={key}
          className="markdoc-link"
          href={href}
          rel="noreferrer"
          target="_blank"
        >
          {renderChildren(tag.children, key)}
        </a>
      );
    }
    default:
      return <span key={key}>{renderChildren(tag.children, key)}</span>;
  }
}

/**
 * Renders a {@link MarkdocContent} value to an array of React nodes.
 * Supports plain strings, `Paragraph`, `InlineCode`, `Strong`, `Emphasis`, and `Link` tags.
 */
export function renderMarkdocNodes(content: MarkdocContent): ReactNode[] {
  return normalizeMarkdocNodes(content).map((node, index) => {
    return renderMarkdocNode(node, `node-${index}`);
  });
}

export function extractMarkdocText(content: MarkdocContent = []): string {
  return normalizeMarkdocNodes(content)
    .map((node) => {
      if (typeof node === 'string') {
        return node;
      }

      if (node.name === 'InlineCode') {
        return String(node.attributes?.content ?? '');
      }

      return extractMarkdocText(node.children ?? []);
    })
    .join('');
}

function extractPlainTextParagraphs(
  content: MarkdocContent | null | undefined,
): string[] | null {
  const nodes = normalizeMarkdocNodes(content);

  if (nodes.length === 0) {
    return [''];
  }

  if (nodes.every((node) => typeof node === 'string')) {
    return [nodes.join('')];
  }

  const paragraphs: string[] = [];

  for (const node of nodes) {
    if (typeof node === 'string') {
      return null;
    }

    if (node.name !== 'Paragraph') {
      return null;
    }

    const children = normalizeMarkdocNodes(node.children);

    if (!children.every((child) => typeof child === 'string')) {
      return null;
    }

    paragraphs.push(children.join(''));
  }

  return paragraphs;
}

export function formatMarkdocForInspector(content: MarkdocContent = []): string {
  const plainTextParagraphs = extractPlainTextParagraphs(content);

  if (plainTextParagraphs) {
    return plainTextParagraphs.join('\n\n');
  }

  return JSON.stringify(content, null, 2);
}

function createParagraphTag(text: string): MarkdocTag {
  return {
    $$mdtype: 'Tag',
    name: 'Paragraph',
    attributes: {},
    children: [text],
  };
}

export function markdocFromPlainText(source: string): MarkdocContent {
  const trimmed = source.trim();

  if (!trimmed) {
    return [];
  }

  const paragraphs = trimmed
    .split(/\n\s*\n/g)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return [];
  }

  if (paragraphs.length === 1) {
    return [createParagraphTag(paragraphs[0]!)];
  }

  return paragraphs.map((paragraph) => createParagraphTag(paragraph));
}

export function parseMarkdocInspectorInput(source: string):
  | { content: MarkdocContent; error?: undefined }
  | { content?: undefined; error: string } {
  const trimmed = source.trim();

  if (!trimmed) {
    return {
      content: [],
    };
  }

  if (/^[\[{"]/.test(trimmed)) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      return {
        error: 'Invalid Markdoc JSON.',
      };
    }

    if (!isMarkdocContentValue(parsed)) {
      return {
        error: 'Markdoc JSON must be a string, a tag object, or an array of Markdoc nodes.',
      };
    }

    return {
      content: parsed,
    };
  }

  return {
    content: markdocFromPlainText(source),
  };
}

interface TruncateState {
  remaining: number;
}

function truncateText(value: string, state: TruncateState) {
  if (state.remaining <= 0) {
    return null;
  }

  if (value.length <= state.remaining) {
    state.remaining -= value.length;
    return value;
  }

  const hardCut = Math.max(state.remaining - 1, 0);
  // Walk backwards within the last 20% of the budget to find a word boundary.
  const lookbackStart = Math.floor(hardCut * 0.8);
  let cutAt = hardCut;
  for (let i = hardCut; i >= lookbackStart; i -= 1) {
    if (/\s/.test(value[i] ?? '')) {
      cutAt = i;
      break;
    }
  }

  const clipped = value.slice(0, cutAt).trimEnd();
  state.remaining = 0;
  return clipped ? `${clipped}…` : '…';
}

function truncateTag(tag: MarkdocTag, state: TruncateState): MarkdocTag | null {
  if (state.remaining <= 0) {
    return null;
  }

  if (tag.name === 'InlineCode') {
    const content = String(tag.attributes?.content ?? '');
    const truncatedContent = truncateText(content, state);

    if (truncatedContent === null) {
      return null;
    }

    return {
      ...tag,
      attributes: {
        ...tag.attributes,
        content: truncatedContent,
      },
    };
  }

  const children = normalizeMarkdocNodes(tag.children);

  if (children.length === 0) {
    return tag;
  }

  const truncatedChildren: MarkdocNode[] = [];

  for (const child of children) {
    const truncatedChild = truncateMarkdocNode(child, state);

    if (truncatedChild === null || truncatedChild === '') {
      continue;
    }

    truncatedChildren.push(truncatedChild);

    if (state.remaining <= 0) {
      break;
    }
  }

  if (truncatedChildren.length === 0) {
    return null;
  }

  return {
    ...tag,
    children: truncatedChildren,
  };
}

function truncateMarkdocNode(
  node: MarkdocNode,
  state: TruncateState,
): MarkdocNode | null {
  if (typeof node === 'string') {
    return truncateText(node, state);
  }

  return truncateTag(node, state);
}

export function truncateMarkdocNodes(
  content: MarkdocContent,
  limit: number,
): MarkdocNode[] {
  const state: TruncateState = { remaining: limit };
  const truncated: MarkdocNode[] = [];

  for (const node of normalizeMarkdocNodes(content)) {
    const nextNode = truncateMarkdocNode(node, state);

    if (nextNode === null || nextNode === '') {
      continue;
    }

    truncated.push(nextNode);

    if (state.remaining <= 0) {
      break;
    }
  }

  return truncated;
}
