import { notion } from "../../lib/notion";
import { BUILDINGS, ELEVATIONS } from "../../lib/notion-schema";
import { syncProjectCompletion } from "../../lib/checkProjectComplete";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { projectId, buildingId, elevationNames, submittedBy } = req.body || {};

  if (!projectId || !buildingId || !Array.isArray(elevationNames)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // 1. Create one Elevations DB row per elevation name (if any).
    // Elevation Code (the title) is intentionally left blank — Rodrigo's
    // existing Notion automation fills it on "page added".
    const e = ELEVATIONS.fields;
    for (const name of elevationNames) {
      await notion.pages.create({
        parent: { database_id: ELEVATIONS.dataSource },
        properties: {
          [e.buildingName]: { relation: [{ id: buildingId }] },
          [e.project]: { relation: [{ id: projectId }] },
          [e.elevationName]: { select: { name } },
          [e.submittedBy]: {
            rich_text: [{ text: { content: submittedBy || "" } }],
          },
        },
      });
    }

    // 2. Flip the Building's Ops Log Created checkbox.
    await notion.pages.update({
      page_id: buildingId,
      properties: {
        [BUILDINGS.fields.opsLogCreated]: { checkbox: true },
      },
    });

    // 3. Sync the Project's checkbox using the shared, reusable check.
    const allDone = await syncProjectCompletion(projectId);

    res.status(200).json({ success: true, projectCompleted: allDone });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Submission failed" });
  }
}