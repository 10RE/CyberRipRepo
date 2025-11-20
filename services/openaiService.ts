
import OpenAI from "openai";

// Safely retrieve the key (Vite replaces process.env with string literals)
const apiKey = process.env.DASHSCOPE_API_KEY;

console.log("API Key:", apiKey);

// Initialize the client only if the key exists
const client = apiKey ? new OpenAI({
  apiKey: apiKey,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  dangerouslyAllowBrowser: true // Required for client-side usage
}) : null;

export const generateWittyEulogy = async (name: string, cause: string): Promise<string> => {
  if (!client) {
    return `Here lies ${name}. They died of ${cause}. (API Key missing - running in offline mode)`;
  }

  try {
    const prompt = `
      Write a witty, cynical, and slightly dark humorous eulogy for "${name}" who died from "${cause}".
      The tone should be like a 8-bit RPG NPC or a bored funeral director.
      Target length: 75 words. 
      Break it into distinct sentences. Do not be overly offensive, just satirical.
      If the cause is abstract (e.g. "My motivation"), personify it.
    `;

    const response = await client.chat.completions.create({
      model: "qwen-flash",
      messages: [
        { role: "system", content: "You are a witty, cynical 8-bit funeral director." },
        { role: "user", content: prompt }
      ]
    });

    return response.choices[0].message.content || "Rest in Peace. Words fail us, literally.";
  } catch (error) {
    console.error("DashScope API Error:", error);
    return "The spirits are silent today (API Error). Rest in peace anyway.";
  }
};

export const generateTombstoneInscription = async (): Promise<string> => {
    if (!client) return "404: Life Not Found.";

    try {
        const prompt = "Write a funny, 10-word maximum epitaph for a random gravestone in a pixel art game.";
        const response = await client.chat.completions.create({
            model: "qwen-flash",
            messages: [
                { role: "user", content: prompt }
            ]
        });
        return response.choices[0].message.content || "Here lies a bug.";
    } catch (e) {
        return "Connection to the afterlife timed out.";
    }
}