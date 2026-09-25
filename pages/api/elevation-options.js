import { notion, DB } from "../../lib/notion";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const source = await notion.databases.retrieve({
      database_id: DB.elevations,
    });

    const options =
      source.properties["Elevation Name"]?.select?.options?.map(
        (o) => o.name
      ) || [];

    res.status(200).json({ options });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load elevation options" });
  }
}