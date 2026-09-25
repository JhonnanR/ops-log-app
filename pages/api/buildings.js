import { notion, plainText } from "../../lib/notion";
import { getPropById } from "../../lib/notion-helpers";
import { BUILDINGS } from "../../lib/notion-schema";
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
        database_id: BUILDINGS.dataSource,
        start_cursor: cursor,
      });

      for (const page of response.results) {
        const props = page.properties;
        const projectRelation = getPropById(props, BUILDINGS.fields.project)?.relation || [];
        if (!projectRelation.some((r) => r.id === projectId)) continue;

        results.push({
          id: page.id,
          name: plainText(getPropById(props, BUILDINGS.fields.name)),
          opsLogCreated: !!getPropById(props, BUILDINGS.fields.opsLogCreated)?.checkbox,
        });
      }

      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    results.sort((a, b) => a.name.localeCompare(b.name));

    await syncProjectCompletion(projectId);

    res.status(200).json({ buildings: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load buildings" });
  }
}