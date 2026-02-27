require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY);
  try {
    // List models to see what the key actually has access to
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.EXPO_PUBLIC_GEMINI_API_KEY}`);
    const data = await response.json();
    console.log("Available models:", data.models?.map(m => m.name));
  } catch (e) {
    console.error("Failed:", e);
  }
}
run();
