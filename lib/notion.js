import { Client } from "@notionhq/client";

export const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

export const DB = {
  projects: process.env.NOTION_PROJECTS_DB,
  buildings: process.env.NOTION_BUILDINGS_DB,
  elevations: process.env.NOTION_ELEVATIONS_DB,
};

// Pulls plain text out of a title/rich_text property array.
export function plainText(prop) {
  if (!prop) return "";
  const arr = prop.title || prop.rich_text || [];
  return arr.map((t) => t.plain_text).join("");
}
