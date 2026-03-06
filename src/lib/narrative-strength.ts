/**
 * Narrative Strength Index (NSI): price represents strength of attention and belief around a narrative.
 * Used for labels, tooltips, and interpretation scale across the app.
 */

export const NSI_TOOLTIP =
  "Narrative Strength reflects how dominant a narrative is in global attention and speculation.";

export const NSI_INTERPRETATION_SCALE = [
  { value: 0, label: "narrative irrelevant" },
  { value: 0.25, label: "niche attention" },
  { value: 0.5, label: "moderate global attention" },
  { value: 0.75, label: "dominant narrative" },
  { value: 1, label: "maximum narrative dominance" },
] as const;

/** Short scale string for UI (e.g. under main NSI value). */
export const NSI_SCALE_SHORT = "0.00 → irrelevant · 0.25 → niche · 0.50 → moderate · 0.75 → dominant · 1.00 → max";

/** Returns interpretation label for a given NSI value (0–1). */
export function getNarrativeStrengthLabel(nsi: number): string {
  if (nsi <= 0) return NSI_INTERPRETATION_SCALE[0].label;
  if (nsi <= 0.25) return NSI_INTERPRETATION_SCALE[1].label;
  if (nsi <= 0.5) return NSI_INTERPRETATION_SCALE[2].label;
  if (nsi <= 0.75) return NSI_INTERPRETATION_SCALE[3].label;
  return NSI_INTERPRETATION_SCALE[4].label;
}
