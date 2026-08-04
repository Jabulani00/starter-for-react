import { Client, TablesDB } from "appwrite";

export const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
export const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
export const PROJECT_NAME = import.meta.env.VITE_APPWRITE_PROJECT_NAME;
export const DB_ID = import.meta.env.VITE_APPWRITE_DB_ID;
export const TABLE_ID = import.meta.env.VITE_APPWRITE_TABLE_ID;

// True only once the database + table IDs are wired up in .env.
export const isConfigured = Boolean(ENDPOINT && PROJECT_ID && DB_ID && TABLE_ID);

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);

const db = new TablesDB(client);

export { client, db };
