import { notion, DB, plainText } from "../../lib/notion";
import { syncProjectCompletion } from "../../lib/checkProjectComplete";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { projectId } = req.query;
  if (!projectId) return res.status(400).json({ error: "projectId required" });

  try {
    const results = [];
    let cursor = undefined;

    do {
      const response = await notion.databases.query({
        database_id: DB.buildings,
        filter: {
          property: "Project",
          relation: { contains: projectId },
        },
        start_cursor: cursor,
      });

      for (const page of response.results) {
        results.push({
          id: page.id,
          name: plainText(page.properties["Building Name"]),
          opsLogCreated: !!page.properties["Ops Log Created"]?.checkbox,
        });
      }

      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    results.sort((a, b) => a.name.localeCompare(b.name));

    // Catches the case where a building was marked done outside this app
    // (manually in Notion, or another automation) — keeps the Project's
    // own checkbox in sync every time its buildings are viewed, not only
    // as a side effect of a submission through this app.
    await syncProjectCompletion(projectId);

    res.status(200).json({ buildings: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load buildings" });
  }
}