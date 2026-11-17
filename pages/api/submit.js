import { notion } from "../../lib/notion";
import { BUILDINGS, ELEVATIONS } from "../../lib/notion-schema";
import { syncProjectCompletion } from "../../lib/checkProjectComplete";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { projectId, buildingId, elevations, submittedBy } = req.body || {};

  if (!projectId || !buildingId || !Array.isArray(elevations)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1. Create one Elevations row per elevation (name + optional page number).
    const e = ELEVATIONS.fields;
    for (const item of elevations) {
      const properties = {
        [e.buildingName]: { relation: [{ id: buildingId }] },
        [e.elevationName]: { select: { name: item.name } },
        [e.submittedBy]: {
          rich_text: [{ text: { content: submittedBy || "" } }],
        },
      };

      if (item.page) {
        properties[e.page] = {
          rich_text: [{ text: { content: item.page } }],
        };
      }

      await notion.pages.create({
        parent: { database_id: ELEVATIONS.dataSource },
        properties,
      });
    }

    // 2. Mark the building as done.
    await notion.pages.update({
      page_id: buildingId,
      properties: {
        [BUILDINGS.fields.opsLogCreated]: { checkbox: true },
      },
    });

    // 3. Mark the project as done if every building is done.
    const allDone = await syncProjectCompletion(projectId);

    res.status(200).json({ success: true, projectCompleted: allDone });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Submission failed" });
  }
}