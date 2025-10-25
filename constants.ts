import { ElementType } from './types';

export const ELEMENT_STYLE: Record<ElementType, { color: string; textColor: string; shape: 'rect' | 'circle' | 'diamond' | 'beveled-rect' }> = {
  [ElementType.Command]: { color: '#3b82f6', textColor: '#ffffff', shape: 'rect' }, // Blue
  [ElementType.Event]: { color: '#f97316', textColor: '#ffffff', shape: 'circle' }, // Orange
  [ElementType.View]: { color: '#22c55e', textColor: '#ffffff', shape: 'rect' }, // Green
  [ElementType.Trigger]: { color: '#facc15', textColor: '#1f2937', shape: 'beveled-rect' }, // Yellow with dark text
  [ElementType.Policy]: { color: '#a855f7', textColor: '#ffffff', shape: 'rect' }, // Purple
  [ElementType.Aggregate]: { color: '#6b7280', textColor: '#ffffff', shape: 'rect' }, // Gray
};

export const NODE_WIDTH = 160;
export const MIN_NODE_HEIGHT = 60;