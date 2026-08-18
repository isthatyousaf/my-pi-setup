/**
 * Token Rate (TPS) Extension
 *
 * Shows the average output tokens per second in Pi's built-in footer.
 */
import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const STATUS_ID = "pi-tps.token-rate";

export default function (pi: ExtensionAPI) {
  let totalOutputTokens = 0;
  let totalSeconds = 0;
  let turnStartMs: number | null = null;
  let turnStreamEndMs: number | null = null;
  let currentTps = 0;

  const reset = () => {
    totalOutputTokens = 0;
    totalSeconds = 0;
    turnStartMs = null;
    turnStreamEndMs = null;
    currentTps = 0;
  };

  pi.on("session_start", async (_event, ctx) => {
    reset();
    ctx.ui.setStatus(STATUS_ID, undefined);
  });

  pi.on("turn_start", async (event) => {
    turnStartMs = event.timestamp ?? Date.now();
    turnStreamEndMs = null;
  });

  pi.on("tool_call", async () => {
    if (turnStartMs !== null && turnStreamEndMs === null) {
      turnStreamEndMs = Date.now();
    }
  });

  pi.on("turn_end", async (event, ctx) => {
    const message = event.message as AssistantMessage | undefined;
    if (!message || message.role !== "assistant") {
      turnStartMs = null;
      turnStreamEndMs = null;
      return;
    }

    const endMs = turnStreamEndMs ?? Date.now();
    const startMs = turnStartMs ?? endMs;
    const elapsedSeconds = Math.max(0.001, (endMs - startMs) / 1000);

    const outputTokens = message.usage?.output ?? 0;
    if (outputTokens > 0) {
      totalOutputTokens += outputTokens;
      totalSeconds += elapsedSeconds;
      if (totalSeconds > 0) currentTps = totalOutputTokens / totalSeconds;
    }

    turnStartMs = null;
    turnStreamEndMs = null;

    const status = currentTps > 0 && Number.isFinite(currentTps)
      ? ctx.ui.theme.fg("success", `${currentTps.toFixed(1)} tok/s`)
      : undefined;
    ctx.ui.setStatus(STATUS_ID, status);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    ctx.ui.setStatus(STATUS_ID, undefined);
  });
}
