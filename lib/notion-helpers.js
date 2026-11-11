// Reads a Notion property by its permanent ID, regardless of its name.
export function getPropById(properties, fieldId) {
  return Object.values(properties).find((prop) => prop.id === fieldId) || null;
}

// True if ANY relation column on this page points at the given page ID.
// Works no matter which relation column holds the link (for example the old
// "Project" or the new "Project v2"), so no property ID is needed.
export function hasRelationTo(properties, pageId) {
  return Object.values(properties).some(
    (prop) =>
      prop.type === "relation" &&
      (prop.relation || []).some((r) => r.id === pageId)
  );
}