import { notion } from "./notion";
import { getPropById } from "./notion-helpers";
import { PROJECTS, BUILDINGS } from "./notion-schema";

// Checks whether every Building under this Project has "Ops Log Created"
// checked; if so, and the Project itself isn't already marked, flips it.
export async function syncProjectCompletion(projectId) {
  const allBuildings = [];
  let cursor = undefined;

  do {
    const response = await notion.databases.query({
      database_id: BUILDINGS.dataSource,
      start_cursor: cursor,
    });

    for (const page of response.results) {
      const projectRelation = getPropById(page.properties, BUILDINGS.fields.project)?.relation || [];
      if (projectRelation.some((r) => r.id === projectId)) {
        allBuildings.push(page);
      }
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  const allDone =
    allBuildings.length > 0 &&
    allBuildings.every(
      (b) => !!getPropById(b.properties, BUILDINGS.fields.opsLogCreated)?.checkbox
    );

  if (allDone) {
    const project = await notion.pages.retrieve({ page_id: projectId });
    const alreadyMarked = !!getPropById(
      project.properties,
      PROJECTS.fields.opsLogCreated
    )?.checkbox;

    if (!alreadyMarked) {
      await notion.pages.update({
        page_id: projectId,
        properties: {
          [PROJECTS.fields.opsLogCreated]: { checkbox: true },
        },
      });
    }
  }

  return allDone;
}