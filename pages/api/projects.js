import { notion, DB, plainText } from "../../lib/notion";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const results = [];
    let cursor = undefined;

    do {
      const response = await notion.databases.query({
        database_id: DB.projects,
        filter: {
          and: [
            { property: "Status", select: { does_not_equal: "Completed" } },
            { property: "Status", select: { does_not_equal: "Punch" } },
            {
              property: "Division",
              multi_select: { does_not_contain: "Brick" },
            },
          ],
        },
        start_cursor: cursor,
      });

      for (const page of response.results) {
        results.push({
          id: page.id,
          name: plainText(page.properties["Project Name"]),
          opsLogCreated: !!page.properties["Ops Log Created"]?.checkbox,
        });
      }

      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    // Ops Log Created projects sort to the bottom; otherwise alphabetical.
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