import { clamp } from './utils';

const LABEL_CHARACTER_WIDTH = 6.8;
const LABEL_HORIZONTAL_PADDING = 20;
const HORIZONTAL_GAP_PADDING = 24;
const MIN_HORIZONTAL_GAP = 72;
const MAX_HORIZONTAL_GAP = 220;

export function estimateConnectionLabelWidth(label?: string) {
  if (typeof label !== 'string' || !label.trim()) {
    return 0;
  }

  return label.trim().length * LABEL_CHARACTER_WIDTH + LABEL_HORIZONTAL_PADDING;
}

export function getDesiredHorizontalConnectionGap(label?: string) {
  const labelWidth = estimateConnectionLabelWidth(label);

  if (labelWidth <= 0) {
    return MIN_HORIZONTAL_GAP;
  }

  return clamp(labelWidth + HORIZONTAL_GAP_PADDING, MIN_HORIZONTAL_GAP, MAX_HORIZONTAL_GAP);
}
