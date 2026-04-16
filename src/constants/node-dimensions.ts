// Canvas node dimensions — single source of truth for layout engine.
// All values in pixels. Used by pedigree-layout.ts and PedigreeCanvas.tsx.

export const NODE = {
  /** Fixed width for all node shapes */
  WIDTH: 140,
  /** Height for square (male) and diamond (unknown) nodes */
  HEIGHT: 56,
  /** Radius for circle (female) nodes — equals HEIGHT/2 */
  RADIUS: 28,
  /** Max characters before truncation with ellipsis */
  MAX_NAME_CHARS: 20,
  /** Internal padding */
  PADDING: 8,
  /** Font size for node name */
  NAME_FONT_SIZE: 13,
  /** Font size for node ID / secondary text */
  ID_FONT_SIZE: 11,
  /** COI badge size */
  BADGE_SIZE: 20,
  /** Badge offset from top-right corner */
  BADGE_OFFSET: 4,
} as const;

export const CONNECTOR = {
  /** Default line thickness */
  THICKNESS: 1.5,
  /** Thickness on hover */
  THICKNESS_HOVER: 2.5,
  /** Mating node (x) diameter */
  MATING_NODE_SIZE: 12,
  /** Cubic bezier control point offset ratio (0-1) */
  BEZIER_CP_RATIO: 0.45,
  /** Litter bracket height */
  LITTER_BRACKET_HEIGHT: 16,
} as const;

export const GENERATION = {
  /** Vertical spacing between generation bands */
  BAND_SPACING: 120,
  /** Left margin for generation label */
  LABEL_MARGIN_LEFT: 16,
  /** Generation label font size */
  LABEL_FONT_SIZE: 12,
} as const;

export const CANVAS = {
  /** Minimum zoom level */
  ZOOM_MIN: 0.1,
  /** Maximum zoom level */
  ZOOM_MAX: 3.0,
  /** Zoom step per scroll tick */
  ZOOM_STEP: 0.1,
  /** Connection handle radius (visible on hover) */
  CONNECT_HANDLE_RADIUS: 4,
  /** Padding around all nodes for viewport calculation */
  VIEWPORT_PADDING: 80,
} as const;
