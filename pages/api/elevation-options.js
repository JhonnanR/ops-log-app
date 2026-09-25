import { notion } from "../../lib/notion";
import { getPropById } from "../../lib/notion-helpers";
import { ELEVATIONS } from "../../lib/notion-schema";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const source = await notion.databases.retrieve({
      database_id: ELEVATIONS.dataSource,
    });

    const elevationNameProp = Object.values(source.properties).find(
      (p) => p.id === ELEVATIONS.fields.elevationName
    );

    const options = elevationNameProp?.select?.options?.map((o) => o.name) || [];

    res.status(200).json({ options });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load elevation options" });
  }
}