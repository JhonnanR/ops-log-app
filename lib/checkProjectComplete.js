import { notion, DB } from "./notion";

// Checks whether every Building under this Project has "Ops Log Created"
// checked; if so, and the Project itself isn't already marked, flips it.
// Called both right after a submission AND whenever the buildings list is
// loaded, so the Project's status stays correct regardless of how an
// individual building got marked done (this app, manually in Notion, or
// any other automation).
export async function syncProjectCompletion(projectId) {
  const allBuildings = [];
  let cursor = undefined;

  do {
    const response = await notion.databases.query({
      database_id: DB.buildings,
      filter: { property: "Project", relation: { contains: projectId } },
      start_cursor: cursor,
    });
    allBuildings.push(...response.results);
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  const allDone =
    allBuildings.length > 0 &&
    allBuildings.every((b) => !!b.properties["Ops Log Created"]?.checkbox);

  if (allDone) {
    const project = await notion.pages.retrieve({ page_id: projectId });
    const alreadyMarked = !!project.properties["Ops Log Created"]?.checkbox;

    if (!alreadyMarked) {
      await notion.pages.update({
        page_id: projectId,
        properties: { "Ops Log Created": { checkbox: true } },
      });
    }
  }

  return allDone;
}