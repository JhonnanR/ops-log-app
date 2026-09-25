// Reads a Notion property by its permanent ID, regardless of what it's
// currently named. Use this instead of properties["Some Name"].
export function getPropById(properties, fieldId) {
  return Object.values(properties).find((prop) => prop.id === fieldId) || null;
}

// For WRITING, no helper is needed — Notion's API accepts the property ID
// directly as the object key, same as it accepts the name.
