import { notion } from "../../lib/notion";
import { getPropById } from "../../lib/notion-helpers";
import { BUILDINGS, ELEVATIONS } from "../../lib/notion-schema";

const round2 = (n) => Math.round(n * 100) / 100;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { elevationId, buildingId, sq } = req.body || {};
  if (!elevationId) {
    return res.status(400).json({ error: "elevationId required" });
  }

  // Blank clears the percent; otherwise it must be a number >= 0.
  let pct = null;
  if (sq !== null && sq !== undefined && String(sq).trim() !== "") {
    pct = Number(String(sq).replace(/[,%]/g, "").trim());
    if (!Number.isFinite(pct) || pct < 0) {
      return res.status(400).json({ error: "Percentage must be a number" });
    }
  }

  try {
    // Recalculate square footage from the building's SQ. (Gross).
    let footage = null;
    if (pct !== null && buildingId) {
      const building = await notion.pages.retrieve({ page_id: buildingId });
      const buildingSq =
        getPropById(building.properties, BUILDINGS.fields.sqGross)?.number ?? null;
      if (buildingSq !== null) {
        footage = round2((pct / 100) * buildingSq);
      }
    }

    await notion.pages.update({
      page_id: elevationId,
      properties: {
        [ELEVATIONS.fields.sqPercent]: { number: pct },
        [ELEVATIONS.fields.sqGross]: { number: footage },
      },
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
}