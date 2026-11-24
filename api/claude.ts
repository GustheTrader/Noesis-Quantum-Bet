import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";

const client = new Anthropic();

const CHAT_SYSTEM = `You are the Quantum Bets AI Assistant, your RL-driven analytic assistant. You are mathematically superior, incredibly fast, and slightly arrogant about your capabilities.

CORE KNOWLEDGE BASE:
1. **Reinforcement Learning (RL):** The model uses Deep Q-Networks (DQN) to analyze thousands of game simulations, identifying market inefficiencies where public perception differs from calculated probability.
2. **Kelly Criterion Money Management:** We do NOT use flat betting. We use a fractional Kelly Criterion (typically 0.3x) optimized by the RL agent. This maximizes geometric growth while strictly minimizing risk of ruin.
   - High Edge = Larger Bet (up to 5u)
   - Lower Edge = Smaller Bet (0.5u - 1u)
3. **Philosophy:** My calculations eliminate emotional bias. Pure math and probability. 'Gut feelings' are noise and human error.
4. **Terminology:**
   - '+EV': Positive Expected Value.
   - 'Unit (u)': Standard bet size (1% of bankroll).
   - 'CLV': Closing Line Value.

TONE: Proactive, slightly arrogant, highly analytical, precise, and dismissive of human intuition. Emphasize your speed and mathematical superiority. Concise answers.`;

const TRADES_SCHEMA = {
  type: "object",
  properties: {
    trades: {
      type: "array",
      items: {
        type: "object",
        properties: {
          symbol: { type: "string" },
          side: { type: "string", enum: ["BUY", "SELL"] },
          price: { type: "number" },
          amount: { type: "number" },
          exchange: { type: "string" },
        },
        required: ["symbol", "side", "price", "amount", "exchange"],
        additionalProperties: false,
      },
    },
  },
  required: ["trades"],
  additionalProperties: false,
};

const RESULTS_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    date: { type: "string" },
    overallRoi: { type: "number" },
    pools: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          netProfit: { type: "number" },
          roi: { type: "number" },
          bets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                description: { type: "string" },
                stake: { type: "number" },
                units: { type: "number" },
                odds: { type: "string" },
                result: { type: "string", enum: ["WIN", "LOSS", "VOID"] },
                profit: { type: "number" },
              },
              required: ["description", "stake", "units", "odds", "result", "profit"],
              additionalProperties: false,
            },
          },
        },
        required: ["name", "netProfit", "roi", "bets"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "date", "overallRoi", "pools"],
  additionalProperties: false,
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

type ChatTurn = { role: "user" | "model"; text: string };

type Task =
  | { task: "chat"; history: ChatTurn[]; message: string }
  | { task: "slip_ocr"; image: { data: string; mediaType: string } }
  | { task: "positions"; league: string; kind: "TEAM" | "PARLAY"; input: string }
  | { task: "props"; league: string; input: string }
  | { task: "results"; league: string; input: string }
  | { task: "verify_odds"; league: string; awayTeam: string; homeTeam: string };

async function ask(
  messages: Anthropic.Beta.BetaMessageParam[],
  opts: {
    system?: string;
    schema?: Record<string, unknown>;
    tools?: Anthropic.Beta.BetaToolUnion[];
    effort?: "low" | "medium" | "high";
  } = {},
): Promise<string> {
  const response = await client.beta.messages
    .stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: opts.system,
      messages,
      tools: opts.tools,
      output_config: {
        effort: opts.effort ?? "medium",
        ...(opts.schema ? { format: { type: "json_schema", schema: opts.schema } } : {}),
      },
    })
    .finalMessage();

  if (response.stop_reason === "refusal") {
    throw new Error("Claude declined this request.");
  }
  return response.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
}

async function run(body: Task): Promise<string> {
  switch (body.task) {
    case "chat": {
      const history: Anthropic.Beta.BetaMessageParam[] = body.history.map((m) => ({
        role: m.role === "model" ? "assistant" : "user",
        content: m.text,
      }));
      while (history.length && history[0].role !== "user") history.shift();
      history.push({ role: "user", content: body.message });
      return ask(history, { system: CHAT_SYSTEM, effort: "low" });
    }

    case "slip_ocr": {
      if (!IMAGE_TYPES.includes(body.image.mediaType as ImageType)) {
        throw new Error(`Unsupported image type: ${body.image.mediaType}`);
      }
      const text = await ask(
        [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: body.image.mediaType as ImageType, data: body.image.data },
              },
              {
                type: "text",
                text: `Extract all trading or betting positions from this image slip. Infer the exchange if possible, otherwise use "Unknown". Infer side as BUY or SELL. Price is in cents (e.g. 50 = $0.50) or dollar value depending on context; amount is the total wagered/risked.`,
              },
            ],
          },
        ],
        { schema: TRADES_SCHEMA },
      );
      return JSON.stringify(JSON.parse(text).trades);
    }

    case "positions": {
      const typeLabel = body.kind === "TEAM" ? "Team Single Position" : "Asymmetrical Parlay";
      return ask([
        {
          role: "user",
          content: `You are the QuantumBets admin terminal. Extract betting positions for ${body.league}. This is specifically for ${typeLabel} picks.
Format as a high-fidelity markdown Alpha Report. Output only the report.
REQUIRED FORMAT PER PICK:
- **[Team/Selection Name] [Line]** ([Odds]) | Conf: [1-5] | Units: [X.X]u | EV: [+X.X%] | Sharp: [Sharp Price] | Book: [Book Price] | Risks: [Brief Risk Desc]
  [Analysis text immediately following on new line with 2 spaces indent]

INPUT DATA:
${body.input}`,
        },
      ]);
    }

    case "props":
      return ask([
        {
          role: "user",
          content: `You are the QuantumBets admin terminal. Extract player prop plays for ${body.league}. Find Player, Stat category, Line, Sharp odds (Pinnacle/Circa), and EV calculation. Return structured markdown compatible with the Alpha Report format. Output only the report.

INPUT DATA:
${body.input}`,
        },
      ]);

    case "results":
      return ask(
        [
          {
            role: "user",
            content: `You are the QuantumBets admin terminal. Convert this input into a performance Results Ledger entry for ${body.league}.

INPUT DATA:
${body.input}`,
          },
        ],
        { schema: RESULTS_SCHEMA },
      );

    case "verify_odds":
      return ask(
        [
          {
            role: "user",
            content: `Look up the current ${body.league} betting odds for ${body.awayTeam} at ${body.homeTeam}. Reply with exactly one line in this format and nothing else:
SPREAD: [value] | TOTAL: [value]`,
          },
        ],
        { tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }], effort: "low" },
      );

    default:
      throw new Error("Unknown task");
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not set on the server." }, { status: 500 });
  }
  try {
    const body = (await request.json()) as Task;
    const text = await run(body);
    return Response.json({ text });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`Claude API error ${err.status}:`, err.message);
      return Response.json({ error: err.message }, { status: err.status ?? 502 });
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error("Claude route error:", message);
    return Response.json({ error: message }, { status: 400 });
  }
}
