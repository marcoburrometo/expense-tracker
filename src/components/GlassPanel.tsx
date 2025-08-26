"use client";
import React from 'react';
import clsx from 'clsx';

// Variants mapped to utility class combinations.
// Adjust here if semantic changes to tokens / blur intensities occur.
// Additive variants. In rare cases we need a composition (e.g. navbar wanted flat + pure)
// Instead of supporting arrays, define an explicit composite variant 'flat-pure' for clarity.
export type GlassVariant = 'default' | 'pure' | 'subtle' | 'flat' | 'frosted' | 'elevated' | 'solid' | 'flat-pure';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLElement> {
  variant?: GlassVariant;
  as?: React.ElementType;
  noPadding?: boolean;
}

const variantClass: Record<GlassVariant, string> = {
  default: 'glass-panel',
  pure: 'glass-panel glass-panel--pure',
  subtle: 'glass-panel glass-panel--subtle',
  flat: 'glass-panel glass-panel--flat',
  frosted: 'glass-panel glass-panel--frosted',
  elevated: 'glass-panel glass-panel--elevated',
  solid: 'glass-panel glass-panel--solid',
  'flat-pure': 'glass-panel glass-panel--flat glass-panel--pure'
};

export const GlassPanel = React.forwardRef<HTMLElement, GlassPanelProps>(function GlassPanelBase({
  variant = 'default',
  as: Tag = 'div',
  className,
  noPadding = false,
  children,
  ...rest
}, ref) {
  // We cannot know precise intrinsic element type; rely on HTMLElement base.
  return <Tag ref={ref as React.Ref<HTMLElement>} className={clsx(variantClass[variant], !noPadding && 'p-4', className)} {...rest}>{children}</Tag>;
});

export default GlassPanel;
