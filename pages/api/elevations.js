import { notion, DB } from "../../lib/notion";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { buildingId } = req.query;
  if (!buildingId) return res.status(400).json({ error: "buildingId required" });

  try {
    const results = [];
    let cursor = undefined;

    do {
      const response = await notion.databases.query({
        database_id: DB.elevations,
        filter: {
          property: "Building Name",
          relation: { contains: buildingId },
        },
        start_cursor: cursor,
      });

      for (const page of response.results) {
        results.push({
          id: page.id,
          name: page.properties["Elevation Name"]?.select?.name || "(unnamed)",
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