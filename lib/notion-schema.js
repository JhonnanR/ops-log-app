// Central Notion schema — uses permanent property IDs instead of names.
// Renaming a column, or fixing a typo/spacing in Notion, will NEVER break
// this file, since IDs never change even when the display name does.

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
    project: "gJXJ",
    opsLogCreated: "jukH",
  },
};

export const ELEVATIONS = {
  dataSource: process.env.NOTION_ELEVATIONS_DB,
  fields: {
    project: "AF%3DO",
    buildingName: "Wbr%7C",
    elevationName: "d%5E%3BA",
    submittedBy: "akqz",
  },
};