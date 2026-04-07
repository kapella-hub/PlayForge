import Anthropic from "@anthropic-ai/sdk";
import type { CanvasData } from "@/engine/types";
import { FORMATIONS } from "@/engine/constants";
import { ROUTE_LIBRARY } from "@/engine/routes-library";

const SYSTEM_PROMPT = `You are a football play designer AI. You generate play diagrams as JSON.

## Field Coordinate System
- Canvas is 1000px wide (x: 0-1000) and 600px tall (y: 0-600)
- The Line of Scrimmage (LOS) is at y=350
- Offense lines up BELOW the LOS (higher y values, e.g. y=350 to y=460)
- Defense lines up ABOVE the LOS (lower y values, e.g. y=200 to y=330)
- y decreases going upfield (toward the end zone the offense is attacking)
- Field center is x=500
- Sidelines are roughly x=50 and x=950

## Available Formations
${FORMATIONS.map((f) => `- "${f.id}" (${f.name}, ${f.side}, ${f.players.length} players): players [${f.players.map((p) => `${p.label}@(${p.x},${p.y})`).join(", ")}]`).join("\n")}

## Available Route Types
${ROUTE_LIBRARY.map((r) => `- "${r.id}" (${r.name}, ${r.category}): ${r.description}. Offsets: [${r.offsets.map((o) => `(dx:${o.dx}, dy:${o.dy})`).join(", ")}]`).join("\n")}

## Route line types
- "solid" = primary receiver route
- "dashed" = secondary/clearout route
- "thick" = blocking assignment

## Output Format
Return ONLY a valid JSON object matching this TypeScript interface (no markdown, no explanation):

{
  "players": [{ "id": string, "label": string, "x": number, "y": number, "side": "offense" | "defense" }],
  "routes": [{ "playerId": string, "waypoints": [{ "x": number, "y": number }], "type": "solid" | "dashed" | "thick", "routeType": string }],
  "motions": [],
  "meta": { "formation": string, "playType": string, "side": "offense" | "defense" }
}

When generating routes, compute absolute waypoints by adding each route template's offsets to the player's position. For example, if player is at (500, 350) and the route offset is (dx: 0, dy: -80), the waypoint is (500, 270).

Always pick a real formation from the list above. Assign routes from the route library to each skill player. OL (LT, LG, C, RG, RT) should get pass-pro or drive-block assignments for passing or running plays respectively.`;

export async function generatePlayFromDescription(
  description: string,
  options: {
    side?: "offense" | "defense";
    formation?: string;
    gameFormat?: string;
  } = {},
): Promise<CanvasData> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your .env file to use AI play generation.",
    );
  }

  const client = new Anthropic({ apiKey });

  let userPrompt = `Generate a football play: "${description}"`;
  if (options.side) userPrompt += `\nSide: ${options.side}`;
  if (options.formation) userPrompt += `\nPreferred formation: ${options.formation}`;
  if (options.gameFormat) userPrompt += `\nGame format: ${options.gameFormat}`;
  userPrompt += "\n\nReturn ONLY the JSON object, no other text.";

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI returned no text response");
  }

  try {
    // Extract JSON from the response (handle potential markdown code blocks)
    let jsonStr = textBlock.text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr) as CanvasData;

    // Basic validation
    if (
      !parsed.players ||
      !Array.isArray(parsed.players) ||
      !parsed.routes ||
      !Array.isArray(parsed.routes) ||
      !parsed.meta
    ) {
      throw new Error("Invalid structure");
    }

    // Ensure motions array exists
    if (!parsed.motions) {
      parsed.motions = [];
    }

    return parsed;
  } catch {
    throw new Error(
      "AI returned invalid play data. Please try rephrasing your description.",
    );
  }
}
