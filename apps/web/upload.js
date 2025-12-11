// טוען את המפתחות מקובץ .env
require('dotenv').config();

const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

// --- הגדרות ---
// מושך את המפתחות מהסביבה
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;

const INDEX_NAME = "flowbot-index";

// בדיקה שהמפתחות קיימים (כדי למנוע שגיאות מוזרות)
if (!OPENAI_API_KEY || !PINECONE_API_KEY) {
  console.error("שגיאה: אחד או יותר מהמפתחות חסרים בקובץ .env");
  process.exit(1);
}

// אתחול הלקוחות
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- נתונים לדוגמה ---
const dataToUpload = [
  { id: "info_1", text: "שעות הפעילות שלנו הן בימים א-ה בין השעות 09:00 ל-18:00." },
  { id: "info_2", text: "כתובת המשרד היא רחוב הברזל 10, תל אביב." },
  { id: "info_3", text: "כדי לפתוח קריאת שירות יש לשלוח מייל ל-support@flowbot.com." },
  { id: "info_4", text: "המוצר שלנו עוזר לנהל תהליכי אוטומציה בקלות." }
];

async function main() {
  console.log("🔄 מתחיל בתהליך העלאת הנתונים...");

  const index = pinecone.index(INDEX_NAME);

  for (const item of dataToUpload) {
    try {
      // 1. יצירת וקטור (Embedding)
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: item.text,
      });

      const vector = response.data[0].embedding;

      // 2. שמירה ב-Pinecone
      await index.upsert([
        {
          id: item.id,
          values: vector,
          metadata: { text: item.text }
        }
      ]);

      console.log(`✅ הועלתה רשומה: ${item.id}`);

    } catch (error) {
      console.error(`❌ שגיאה ב-${item.id}:`, error);
    }
  }

  console.log("\n🎉 סיימנו! הנתונים מוכנים.");
}

main();
