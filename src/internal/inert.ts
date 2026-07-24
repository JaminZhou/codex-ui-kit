// React 18 treats `inert` as an unknown attribute and drops boolean `true`.
// Numeric `1` serializes the HTML boolean attribute there, while React 19
// handles the same value as enabled without a runtime warning.
const enabledInertValue = 1 as unknown as true;

export function inertWhen(active: boolean): true | undefined {
  return active ? enabledInertValue : undefined;
}
