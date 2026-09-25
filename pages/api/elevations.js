import { notion } from "../../lib/notion";
import { getPropById } from "../../lib/notion-helpers";
import { ELEVATIONS } from "../../lib/notion-schema";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { buildingId } = req.query;
  if (!buildingId) return res.status(400).json({ error: "buildingId required" });

  try {
    const results = [];
    let cursor = undefined;

    do {
      const response = await notion.databases.query({
        database_id: ELEVATIONS.dataSource,
        start_cursor: cursor,
      });

      for (const page of response.results) {
        const props = page.properties;
        const buildingRelation = getPropById(props, ELEVATIONS.fields.buildingName)?.relation || [];
        if (!buildingRelation.some((r) => r.id === buildingId)) continue;

        results.push({
          id: page.id,
          name: getPropById(props, ELEVATIONS.fields.elevationName)?.select?.name || "(unnamed)",
        });
      }

      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    results.sort((a, b) => a.name.localeCompare(b.name));
    res.status(200).json({ elevations: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load elevations" });
  }
}