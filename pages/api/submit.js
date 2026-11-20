import { notion } from "../../lib/notion";
import { getPropById } from "../../lib/notion-helpers";
import { BUILDINGS, ELEVATIONS } from "../../lib/notion-schema";
import { syncProjectCompletion } from "../../lib/checkProjectComplete";

const round2 = (n) => Math.round(n * 100) / 100;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { projectId, buildingId, elevations, submittedBy } = req.body || {};

  if (!projectId || !buildingId || !Array.isArray(elevations)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const e = ELEVATIONS.fields;

    // Look up the building's SQ. (Gross) once, to turn each percent into
    // square footage.
    let buildingSq = null;
    const hasPercent = elevations.some(
      (i) => i.sq !== null && i.sq !== undefined && String(i.sq).trim() !== ""
    );
    if (hasPercent) {
      const building = await notion.pages.retrieve({ page_id: buildingId });
      buildingSq =
        getPropById(building.properties, BUILDINGS.fields.sqGross)?.number ?? null;
    }

    // 1. Create one Elevations row per elevation.
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

      if (item.sq !== null && item.sq !== undefined && String(item.sq).trim() !== "") {
        const pct = Number(String(item.sq).replace(/[,%]/g, ""));
        if (Number.isFinite(pct)) {
          properties[e.sqPercent] = { number: pct };
          if (buildingSq !== null) {
            properties[e.sqGross] = { number: round2((pct / 100) * buildingSq) };
          }
        }
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