import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// טעינת משתנים
dotenv.config({ path: path.resolve(__dirname, '.env') });

// --- הגדרות עיצוב ---
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  bold: "\x1b[1m",
  dim: "\x1b[2m"
};

// --- המידע שנרצה ללמד את הבוט (Knowledge Base) ---
const KNOWLEDGE_DATA = [
  {
    id: "flowbot-overview",
    text: "FlowBot היא פלטפורמה לבניית בוטים לווטסאפ לעסקים. המערכת מאפשרת ליצור בוטים חכמים בקלות ללא כתיבת קוד מורכב."
  },
  {
    id: "flowbot-process",
    text: "תהליך העבודה ב-FlowBot מורכב מחמישה שלבים עיקריים: 1. Intro (היכרות), 2. Build (בניית הזרימה), 3. Simulate (בדיקה והרצה), 4. Connect (חיבור לווטסאפ), 5. Publish (פרסום לעולם)."
  },
  {
    id: "flowbot-features",
    text: "המערכת כוללת מנוע AI מתקדם התומך בטעינת קבצים, קריאת PDF, סריקת אתרים ועיבוד טקסט כדי לאמן את הבוט על המידע העסקי שלך."
  },
  {
    id: "flowbot-language",
    text: "FlowBot תומכת באופן מלא בעברית ובשפות נוספות, כולל התאמה ל-RTL ועיבוד שפה טבעית ברמה גבוהה."
  }
];

console.log(`${colors.cyan}${colors.bold}
┌──────────────────────────────────────────────────┐
│  FlowBot AI - Knowledge Seeder                   │
│  ${colors.dim}Injecting data into Pinecone...${colors.cyan}                 │
└──────────────────────────────────────────────────┘
${colors.reset}`);

const pineconeKey = process.env.PINECONE_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const indexName = process.env.PINECONE_INDEX || "flowbot-index"; 

if (!pineconeKey || !openaiKey) {
  console.error(`${colors.yellow}Missing API Keys in .env${colors.reset}`);
  process.exit(1);
}

const pc = new Pinecone({ apiKey: pineconeKey });
const openai = new OpenAI({ apiKey: openaiKey });

async function seed() {
  try {
    console.log(`${colors.dim}➜ Connecting to index: ${indexName}...${colors.reset}`);
    const index = pc.index(indexName);

    console.log(`${colors.dim}➜ Processing ${KNOWLEDGE_DATA.length} knowledge items...${colors.reset}\n`);
    
    const vectors = [];

    for (const item of KNOWLEDGE_DATA) {
      // 1. יצירת Embedding
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: item.text,
      });

      // 2. הכנת הוקטור לשליחה
      vectors.push({
        id: item.id,
        values: embedding.data[0].embedding,
        metadata: {
          text: item.text, // שומרים את הטקסט המקורי כדי לשלוף אותו אח"כ
          source: "seed_script"
        }
      });

      process.stdout.write(`${colors.green}✔ Prepared: ${colors.reset}${item.id}\n`);
    }

    // 3. שליחה ל-Pinecone (Upsert)
    console.log(`\n${colors.dim}➜ Uploading vectors to Pinecone...${colors.reset}`);
    await index.upsert(vectors);

    console.log(`\n${colors.cyan}${colors.bold}SUCCESS!${colors.reset} Database seeded with ${vectors.length} items.`);
    console.log(`${colors.yellow}Tip: Now run 'node test_bot.js' again to see the magic.${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Seeding Failed:${colors.reset}`, error);
  }
}

seed();
