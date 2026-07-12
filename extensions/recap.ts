/**
 * recap — a "where were we" one-liner, pi's take on Claude Code's Recap.
 *
 * How it works:
 *  - After each turn finishes, an idle timer starts (default 3 min).
 *  - pi has no terminal focus/blur event, so idleness is the proxy for "stepped away".
 *  - When it fires, a cheap side model call summarizes the conversation in <=40 words
 *    and pins it above the editor (setWidget). It's waiting for you when you come back.
 *  - The widget clears the moment you act again.
 *  - `/recap` generates one on demand.
 *
 * Disable the auto-timer with PI_RECAP_IDLE_MS=0 (the /recap command still works).
 * Tune the delay with PI_RECAP_IDLE_MS=<milliseconds>.
 */

import { complete, type UserMessage } from "@earendil-works/pi-ai/compat";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const IDLE_MS = (() => {
	const raw = process.env.PI_RECAP_IDLE_MS;
	if (raw === undefined) return 180_000; // 3 min, matches Claude Code's generation delay
	const n = Number(raw);
	return Number.isFinite(n) && n >= 0 ? n : 180_000;
})();

const RECAP_INSTRUCTIONS =
	"The user stepped away and is coming back. Recap in under 40 words, 1-2 plain " +
	"sentences, no markdown. Lead with the overall goal and current task, then the one " +
	"next action. Skip root-cause narrative, fix internals, secondary to-dos, and em-dash tangents.";

const WIDGET_ID = "recap";

// --- pure helpers (exported for the self-check at the bottom) -----------------

type Entry = { type: string; message?: { role?: string; content?: unknown } };
type Block = { type?: string; text?: string; name?: string };

/** Flatten a session branch into a plain "User:/Assistant:" transcript. */
export function buildTranscript(entries: Entry[]): string {
	const out: string[] = [];
	for (const e of entries) {
		if (e.type !== "message" || !e.message?.role) continue;
		const role = e.message.role;
		if (role !== "user" && role !== "assistant") continue;
		const content = e.message.content;
		const lines: string[] = [];
		if (typeof content === "string") {
			if (content.trim()) lines.push(content.trim());
		} else if (Array.isArray(content)) {
			for (const part of content as Block[]) {
				if (!part || typeof part !== "object") continue;
				if (part.type === "text" && part.text?.trim()) lines.push(part.text.trim());
				else if (part.type === "toolCall" && part.name) lines.push(`[called ${part.name}]`);
			}
		}
		if (lines.length) out.push(`${role === "user" ? "User" : "Assistant"}: ${lines.join("\n")}`);
	}
	return out.join("\n\n");
}

/** Only recap a real conversation: >=2 user turns and >=1 assistant reply. */
export function shouldRecap(entries: Entry[]): boolean {
	let users = 0;
	let assistants = 0;
	for (const e of entries) {
		if (e.type !== "message") continue;
		if (e.message?.role === "user") users++;
		else if (e.message?.role === "assistant") assistants++;
	}
	return users >= 2 && assistants >= 1;
}

const PREFIX = "↩ recap · ";

/** Wrap to the live terminal width, aligning continuation lines under the text. */
function formatLines(text: string): string[] {
	const cols = Math.max(20, (process.stdout.columns ?? 100) - 2);
	const lines = wrap(text, cols - PREFIX.length);
	return lines.map((l, i) => (i === 0 ? PREFIX + l : " ".repeat(PREFIX.length) + l));
}

function wrap(text: string, width = 88): string[] {
	const words = text.replace(/\s+/g, " ").trim().split(" ");
	const lines: string[] = [];
	let cur = "";
	for (const w of words) {
		if (cur && (cur.length + 1 + w.length) > width) {
			lines.push(cur);
			cur = w;
		} else cur = cur ? `${cur} ${w}` : w;
	}
	if (cur) lines.push(cur);
	return lines;
}

// --- generation --------------------------------------------------------------

/** Returns the recap text, or null if it couldn't / shouldn't generate. */
async function generateRecap(ctx: ExtensionContext, signal: AbortSignal, force: boolean): Promise<string | null> {
	if (!ctx.model) return null;
	const branch = ctx.sessionManager.getBranch() as Entry[];
	if (!force && !shouldRecap(branch)) return null;
	const transcript = buildTranscript(branch);
	if (!transcript.trim()) return null;

	const auth = await ctx.modelRegistry.getApiKeyAndHeaders(ctx.model);
	if (!auth.ok || !auth.apiKey) return null;

	const userMessage: UserMessage = {
		role: "user",
		content: [{ type: "text", text: `<conversation>\n${transcript}\n</conversation>` }],
		timestamp: Date.now(),
	};

	const response = await complete(
		ctx.model,
		{ systemPrompt: RECAP_INSTRUCTIONS, messages: [userMessage] },
		{ apiKey: auth.apiKey, headers: auth.headers, signal },
	);
	if (response.stopReason === "aborted") return null;

	const text = response.content
		.filter((c): c is { type: "text"; text: string } => c.type === "text")
		.map((c) => c.text)
		.join("")
		.trim();
	return text || null;
}

// --- extension wiring ---------------------------------------------------------

export default function (pi: ExtensionAPI) {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let controller: AbortController | null = null;

	const cancel = () => {
		if (timer) clearTimeout(timer);
		timer = null;
		controller?.abort();
		controller = null;
	};

	const clearWidget = (ctx: ExtensionContext) => {
		if (ctx.hasUI) ctx.ui.setWidget(WIDGET_ID, undefined);
	};

	const arm = (ctx: ExtensionContext) => {
		cancel();
		if (IDLE_MS <= 0 || !ctx.hasUI) return; // auto-recap disabled
		timer = setTimeout(async () => {
			timer = null;
			if (!ctx.isIdle() || ctx.hasPendingMessages()) return; // agent busy; next turn re-arms
			controller = new AbortController();
			try {
				const text = await generateRecap(ctx, controller.signal, false);
				if (text && ctx.isIdle()) ctx.ui.setWidget(WIDGET_ID, formatLines(text));
			} catch {
				/* stay quiet — a failed recap should never interrupt */
			} finally {
				controller = null;
			}
		}, IDLE_MS);
		timer.unref?.();
	};

	// Fresh session: no stale recap.
	pi.on("session_start", (_e, ctx) => clearWidget(ctx));

	// A turn finished → the user might step away. Start the idle clock.
	pi.on("agent_end", (_e, ctx) => arm(ctx));

	// The user is active again → drop the timer and the pinned recap.
	pi.on("agent_start", (_e, ctx) => {
		cancel();
		clearWidget(ctx);
	});
	pi.on("input", (_e, ctx) => {
		cancel();
		clearWidget(ctx);
	});

	pi.on("session_shutdown", () => cancel());

	// On-demand recap.
	pi.registerCommand("recap", {
		description: "Generate a one-line session recap now",
		handler: async (_args, ctx) => {
			if (!ctx.model) {
				ctx.ui.notify("No model selected", "error");
				return;
			}
			ctx.ui.notify("Generating recap…", "info");
			const ac = new AbortController();
			const text = await generateRecap(ctx, ac.signal, true).catch(() => null);
			if (!text) {
				ctx.ui.notify("Nothing to recap yet — send a message first.", "warning");
				return;
			}
			ctx.ui.setWidget(WIDGET_ID, formatLines(text));
		},
	});
}

// --- runnable self-check: `PI_RECAP_SELFTEST=1 npx jiti recap.ts` -------------
if (process.env.PI_RECAP_SELFTEST) {
	const convo: Entry[] = [
		{ type: "message", message: { role: "user", content: "fix the login bug" } },
		{ type: "message", message: { role: "assistant", content: [{ type: "text", text: "looking" }, { type: "toolCall", name: "read" }] } },
		{ type: "message", message: { role: "user", content: "now run tests" } },
	];
	const t = buildTranscript(convo);
	console.assert(t.includes("User: fix the login bug"), "transcript keeps user text");
	console.assert(t.includes("[called read]"), "transcript notes tool calls");
	console.assert(shouldRecap(convo) === true, "2 users + 1 assistant should recap");
	console.assert(shouldRecap(convo.slice(0, 1)) === false, "single message should not recap");
	console.assert(wrap("a b c", 3).length === 2, "wrap splits on width");
	console.log("recap self-check passed");
}
