export type ClaudeTask =
  | { task: "chat"; history: { role: "user" | "model"; text: string }[]; message: string }
  | { task: "slip_ocr"; image: { data: string; mediaType: string } }
  | { task: "positions"; league: string; kind: "TEAM" | "PARLAY"; input: string }
  | { task: "props"; league: string; input: string }
  | { task: "results"; league: string; input: string }
  | { task: "verify_odds"; league: string; awayTeam: string; homeTeam: string };

export async function askClaude(body: ClaudeTask): Promise<string> {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.text as string;
}
