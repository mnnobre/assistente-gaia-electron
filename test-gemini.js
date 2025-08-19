// test-gemini.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent("Diga apenas a palavra 'Funcionando'.");
    const response = await result.response;
    const text = await response.text();
    console.log("Resposta do Gemini:", text);
  } catch (err) {
    console.error("Erro ao testar o Gemini:", err);
  }
}

run();
