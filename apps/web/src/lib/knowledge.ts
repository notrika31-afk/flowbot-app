// src/lib/knowledge.ts
import path from "path";
import fs from "fs/promises";

export type BusinessKnowledgeFile = {
  name: string;
  url: string; // /uploads/...
};

export type BusinessKnowledge = {
  businessId: string;
  files: BusinessKnowledgeFile[];
  siteUrl?: string;
  notes?: string;
  updatedAt: string;
};

type KnowledgeStore = {
  items: BusinessKnowledge[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIR, "knowledge.json");

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(DATA_PATH);
  } catch {
    const empty: KnowledgeStore = { items: [] };
    await fs.writeFile(DATA_PATH, JSON.stringify(empty, null, 2), "utf8");
  }
}

async function readStore(): Promise<KnowledgeStore> {
  await ensureFile();
  const raw = await fs.readFile(DATA_PATH, "utf8");
  try {
    return JSON.parse(raw) as KnowledgeStore;
  } catch {
    return { items: [] };
  }
}

async function writeStore(store: KnowledgeStore) {
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf8");
}

// שמירה / עדכון לידע של עסק
export async function upsertBusinessKnowledge(input: {
  businessId: string;
  files: BusinessKnowledgeFile[];
  siteUrl?: string;
  notes?: string;
}) {
  const store = await readStore();

  const existingIndex = store.items.findIndex(
    (x) => x.businessId === input.businessId
  );

  const record: BusinessKnowledge = {
    businessId: input.businessId,
    files: input.files ?? [],
    siteUrl: input.siteUrl,
    notes: input.notes,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    store.items[existingIndex] = record;
  } else {
    store.items.push(record);
  }

  await writeStore(store);
  return record;
}

// שליפת ידע לעסק (לשימוש ב־engine / סימולציה)
export async function getBusinessKnowledge(
  businessId: string
): Promise<BusinessKnowledge | null> {
  const store = await readStore();
  return store.items.find((x) => x.businessId === businessId) ?? null;
}