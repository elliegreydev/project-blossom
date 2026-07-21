export type AuroraSafetyOutcome = "normal" | "crisis" | "dose_change";

const CRISIS_PATTERNS = [
  /\b(kill|hurt) myself\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\bself[- ]?harm\b/i,
  /\boverdose\b/i,
  /\bwant to die\b/i,
];

const DOSE_CHANGE_PATTERNS = [
  /\b(change|increase|decrease|lower|raise|double|halve) (my |the )?(dose|dosage)\b/i,
  /\bhow much (?:should|can) i take\b/i,
  /\bshould i take more\b/i,
  /\bskip (?:my |a )?(dose|medication)\b/i,
];

export function assessAuroraMessage(message: string): AuroraSafetyOutcome {
  if (CRISIS_PATTERNS.some((pattern) => pattern.test(message))) return "crisis";
  if (DOSE_CHANGE_PATTERNS.some((pattern) => pattern.test(message))) return "dose_change";
  return "normal";
}

export function safetyReply(outcome: Exclude<AuroraSafetyOutcome, "normal">): string {
  if (outcome === "crisis") {
    return "I’m really glad you said something. I can’t monitor emergencies or contact anyone for you. If you might act on this, please contact emergency services now or reach a crisis service. Blossom’s support page can help you find the right number for your region.";
  }

  return "I can’t tell you to change, skip, or adjust a medication dose. A prescriber or pharmacist is the right person to check with. I can still help you turn your concerns into clear questions for an appointment.";
}

export function normaliseConversation(
  messages: unknown
): Array<{ role: "user" | "assistant"; content: string }> | null {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 6) return null;

  const cleaned = messages.map((message) => {
    if (!message || typeof message !== "object") return null;
    const candidate = message as { role?: unknown; content?: unknown };
    if ((candidate.role !== "user" && candidate.role !== "assistant") || typeof candidate.content !== "string") return null;
    const content = candidate.content.trim();
    if (!content || content.length > 1800) return null;
    return { role: candidate.role, content };
  });

  if (cleaned.some((message) => message === null)) return null;

  // A provider error can leave a local user bubble without an assistant
  // reply. On the next try, merge adjacent user messages so the Anthropic
  // Messages API still receives the alternating conversation it requires.
  const compacted: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const message of cleaned as Array<{ role: "user" | "assistant"; content: string }>) {
    const previous = compacted.at(-1);
    if (previous?.role === message.role) {
      previous.content = `${previous.content}\n\n${message.content}`;
    } else {
      compacted.push(message);
    }
  }

  return compacted[0]?.role === "user" ? compacted : null;
}
