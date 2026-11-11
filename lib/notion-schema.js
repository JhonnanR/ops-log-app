// Central Notion schema: permanent property IDs instead of names.

export const PROJECTS = {
  dataSource: process.env.NOTION_PROJECTS_DB,
  fields: {
    name: "title",
    status: "V%5DdZ",
    division: "b%3A%3BZ",
    opsLogCreated: "G%5EUk",
  },
};

export const BUILDINGS = {
  dataSource: process.env.NOTION_BUILDINGS_DB,
  fields: {
    name: "title",
    opsLogCreated: "jukH",
  },
};

export const ELEVATIONS = {
  dataSource: process.env.NOTION_ELEVATIONS_DB,
  fields: {
    buildingName: "Wbr%7C",
    elevationName: "d%5E%3BA",
    submittedBy: "akqz",
  },
};