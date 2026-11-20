import { notion, plainText } from "../../lib/notion";
import { getPropById, hasRelationTo } from "../../lib/notion-helpers";
import { ELEVATIONS } from "../../lib/notion-schema";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { buildingId } = req.query;
  if (!buildingId) return res.status(400).json({ error: "buildingId required" });

  try {
    const results = [];
    let cursor = undefined;
    const f = ELEVATIONS.fields;

    do {
      const response = await notion.databases.query({
        database_id: ELEVATIONS.dataSource,
        start_cursor: cursor,
      });

      for (const page of response.results) {
        const props = page.properties;
        if (!hasRelationTo(props, buildingId)) continue;

        // Works whether the field holds a permanent ID or a column name.
        const pctProp = getPropById(props, f.sqPercent) || props[f.sqPercent];
        const sqProp = getPropById(props, f.sqGross) || props[f.sqGross];

        results.push({
          id: page.id,
          name: getPropById(props, f.elevationName)?.select?.name || "(unnamed)",
          page: plainText(getPropById(props, f.page)),
          pct: pctProp?.number ?? null,
          sq: sqProp?.number ?? null,
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