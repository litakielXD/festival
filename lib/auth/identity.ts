export function normalizeManagedIdentifier(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/(^\.|\.$)/g, "");
}

export function toManagedEmail(value: string) {
  const slug = normalizeManagedIdentifier(value);
  return `${slug || "member"}@festival.local`;
}
