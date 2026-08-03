/** Shared label for CS owner dropdowns / badges. */
export function formatCsOwnerLabel(owner: { name: string; email: string }) {
  return `${owner.name} · ${owner.email}`;
}
