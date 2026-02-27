const fs = require("fs");
const path = require("path");

async function run() {
  const envPath = path.join(__dirname, ".env");
  const envContent = fs.readFileSync(envPath, "utf8");
  let apiKey = "";

  for (const line of envContent.split("\n")) {
    if (line.startsWith("EXPO_PUBLIC_GEMINI_API_KEY=")) {
      apiKey = line.split("=")[1].trim();
      break;
    }
  }

  if (!apiKey) {
    console.error("No API key found in .env");
    process.exit(1);
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    );
    const data = await response.json();
    if (data.error) {
      console.error("API Error:", data.error.message);
      return;
    }
    const models = data.models || [];
    console.log("Available models for this API Key:");
    models.forEach((m) =>
      console.log(
        `- ${m.name.replace("models/", "")} (Supported methods: ${m.supportedGenerationMethods.join(", ")})`,
      ),
    );
  } catch (e) {
    console.error("Failed:", e);
  }
}

run();
