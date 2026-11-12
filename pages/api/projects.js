import { notion, plainText } from "../../lib/notion";
import { getPropById } from "../../lib/notion-helpers";
import { PROJECTS } from "../../lib/notion-schema";

// Only projects with one of these statuses are shown. Edit this list to
// change which projects appear (for example add "Handoff" or "PreCon").
const ALLOWED_STATUSES = ["Active", "Awarded"];
const HIDDEN_DIVISIONS = ["Brick"];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const results = [];
    let cursor = undefined;

    do {
      const response = await notion.databases.query({
        database_id: PROJECTS.dataSource,
        start_cursor: cursor,
      });

      for (const page of response.results) {
        const props = page.properties;
        const statusProp = getPropById(props, PROJECTS.fields.status);
        const status = statusProp?.status?.name || statusProp?.select?.name || "";
        const divisions = (
          getPropById(props, PROJECTS.fields.division)?.multi_select || []
        ).map((d) => d.name);

        if (!ALLOWED_STATUSES.includes(status)) continue;
        if (divisions.some((d) => HIDDEN_DIVISIONS.includes(d))) continue;

        results.push({
          id: page.id,
          name: plainText(getPropById(props, PROJECTS.fields.name)),
          opsLogCreated: !!getPropById(props, PROJECTS.fields.opsLogCreated)?.checkbox,
        });
      }

      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    results.sort((a, b) => {
      if (a.opsLogCreated !== b.opsLogCreated) {
        return a.opsLogCreated ? 1 : -1;
      }
      return a.name.localeCompare(b.name);
    });

    res.status(200).json({ projects: results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load projects" });
  }
}