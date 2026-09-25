require("dotenv").config({ path: ".env.local" });
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const databases = {
  PROJECTS: process.env.NOTION_PROJECTS_DB,
  BUILDINGS: process.env.NOTION_BUILDINGS_DB,
  ELEVATIONS: process.env.NOTION_ELEVATIONS_DB,
};

async function main() {
  for (const [label, databaseId] of Object.entries(databases)) {
    if (!databaseId) {
      console.log(`\n=== ${label} === (no database ID set, skipping)`);
      continue;
    }

    try {
      const database = await notion.databases.retrieve({
        database_id: databaseId,
      });

      console.log(`\n=== ${label} ===`);
      for (const [propName, propInfo] of Object.entries(database.properties)) {
        console.log(`  "${propName}" -> id: "${propInfo.id}" (type: ${propInfo.type})`);
      }
    } catch (err) {
      console.log(`\n=== ${label} === ERROR: ${err.message}`);
    }
  }
}

main();