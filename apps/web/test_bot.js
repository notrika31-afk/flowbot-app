import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// טעינת משתנים
dotenv.config({ path: path.resolve(__dirname, '.env') });

// --- הגדרות עיצוב לקונסולה ---
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  bg: "\x1b[44m" // Blue background
};

// --- הגדרות בדיקה ---
const TEST_QUESTIONS = [
  "מה הבוט יודע לעשות?",
  "איך מתחילים תהליך בנייה?",
  "האם יש תמיכה בעברית?",
  // ניתן להוסיף כאן שאלות נוספות
];

console.log(`${colors.cyan}${colors.bold}
┌──────────────────────────────────────────────────┐
│  FlowBot AI - Full Logic Test Runner             │
│  ${colors.dim}Env: Node.js | OpenAI | Pinecone${colors.cyan}               │
└──────────────────────────────────────────────────┘
${colors.reset}`);

// --- אימות משתני סביבה ---
const pineconeKey = (process.env.PINECONE_API_KEY || "").trim();
const openaiKey = (process.env.OPENAI_API_KEY || "").trim();
const targetIndex = process.env.PINECONE_INDEX || "";

if (!pineconeKey || !openaiKey) {
  console.error(`${colors.red}✖ Error: Missing API Keys in .env file.${colors.reset}`);
  if (!pineconeKey) console.error(`  - PINECONE_API_KEY is missing`);
  if (!openaiKey) console.error(`  - OPENAI_API_KEY is missing`);
  process.exit(1);
}

// --- אתחול לקוחות ---
const pc = new Pinecone({ apiKey: pineconeKey });
const openai = new OpenAI({ apiKey: openaiKey });

async function runBotSimulation() {
  console.log(`${colors.dim}➜ Initializing Services...${colors.reset}\n`);

  try {
    // 1. בדיקת חיבור Pinecone וקבלת אינדקס
    const indexes = await pc.listIndexes();
    let indexName = targetIndex;

    if (!indexName) {
      if (indexes && indexes.indexes && indexes.indexes.length > 0) {
        indexName = indexes.indexes[0].name;
        console.log(`${colors.yellow}⚠ No PINECONE_INDEX in .env, using first available: ${colors.bold}${indexName}${colors.reset}`);
      } else {
        throw new Error("No indexes found in Pinecone.");
      }
    }

    console.log(`${colors.green}✔ Connected to Pinecone Index: ${colors.bold}${indexName}${colors.reset}`);
    const index = pc.index(indexName);

    console.log(`\n${colors.bg}${colors.bold} STARTING Q&A SIMULATION ${colors.reset}\n`);

    // 2. לולאת השאלות
    for (const question of TEST_QUESTIONS) {
      await processQuestion(index, question);
    }

    console.log(`\n${colors.green}${colors.bold}✔ All tests completed successfully.${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Critical Error:${colors.reset}`);
    console.error(`${colors.yellow}${error.message}${colors.reset}`);
    console.error(error);
  }
}

// פונקציה המדמה את הלוגיקה של השרת (Embedding -> Search -> Generate)
async function processQuestion(index, question) {
  console.log(`${colors.cyan}➤ Q: ${colors.bold}${question}${colors.reset}`);

  try {
    // A. יצירת Embedding
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: question,
    });
    const vector = embeddingResponse.data[0].embedding;

    // B. חיפוש וקטורי (Retrieval)
    const queryResponse = await index.query({
      vector: vector,
      topK: 3,
      includeMetadata: true,
    });

    const matches = queryResponse.matches || [];
    const contextText = matches.map(m => m.metadata?.text || "").join("\n\n");

    if (matches.length === 0) {
        console.log(`${colors.dim}   (No relevant context found in Pinecone)${colors.reset}`);
    } else {
        console.log(`${colors.dim}   (Found ${matches.length} context chunks, Top Score: ${matches[0].score.toFixed(4)})${colors.reset}`);
    }

    // C. יצירת תשובה (Generation)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI support agent for FlowBot.
Use the following context to answer the user's question.
If the answer is not in the context, say you don't know.
Context:
${contextText}`
        },
        { role: "user", content: question }
      ],
      temperature: 0.7,
    });

    const answer = completion.choices[0].message.content;

    // הדפסת התשובה בצורה מעוצבת
    console.log(`${colors.green}➤ A: ${colors.reset}${answer}`);
    console.log(`${colors.dim}──────────────────────────────────────────────────${colors.reset}\n`);

  } catch (err) {
    console.error(`${colors.red}   Error processing question: ${err.message}${colors.reset}\n`);
  }
}

// הרצת הסקריפט
runBotSimulation();
