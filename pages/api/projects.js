import { notion, plainText } from "../../lib/notion";
import { getPropById } from "../../lib/notion-helpers";
import { PROJECTS } from "../../lib/notion-schema";

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
        const status = getPropById(props, PROJECTS.fields.status)?.select?.name || "";
        const division = (
          getPropById(props, PROJECTS.fields.division)?.multi_select || []
        ).map((d) => d.name);

        if (status === "Completed" || status === "Punch") continue;
        if (division.includes("Brick")) continue;

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