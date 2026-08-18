/**
 * OpenAI Pro reasoning mode + Flex tier toggles.
 *
 * Commands:
 *   /pro-reasoning [on|off|status]  — toggle `reasoning.mode: "pro"`
 *     (https://developers.openai.com/api/docs/guides/reasoning#reasoning-mode)
 *   /flex-tier     [on|off|status]  — toggle `service_tier: "flex"`
 *     (https://developers.openai.com/api/docs/guides/flex-processing)
 *
 * Both only apply to the direct API-key "openai" provider — never
 * "openai-codex" or any other provider.
 *
 * Pro mode is a GPT-5.6-family Responses API feature, so requests are only
 * patched for gpt-5.6* models on api "openai-responses". Flex applies to
 * Responses and Chat Completions requests on the openai provider.
 *
 * Both toggles persist per session via custom session entries.
 */
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const PRO_ENTRY_TYPE = "openai-pro-reasoning";
const FLEX_ENTRY_TYPE = "openai-flex-tier";
const STATUS_KEY = "openai-tier";

type ActiveModel = { provider: string; id: string; api?: string; reasoning?: boolean } | undefined;

function isOpenAIApiKeyProvider(model: ActiveModel): boolean {
	// API-key path only: exact "openai" provider, never "openai-codex".
	return model?.provider === "openai";
}

function supportsProMode(model: ActiveModel): boolean {
	if (!isOpenAIApiKeyProvider(model) || !model) return false;
	// reasoning.mode is a Responses API parameter.
	if (model.api !== "openai-responses") return false;
	// Pro mode is supported on the GPT-5.6 family; dedicated "-pro" model ids
	// already run in pro execution and keep their own behavior/pricing.
	return model.id.startsWith("gpt-5.6") && !model.id.endsWith("-pro");
}

function supportsFlexTier(model: ActiveModel): boolean {
	if (!isOpenAIApiKeyProvider(model) || !model) return false;
	// service_tier is accepted by both the Responses and Chat Completions APIs.
	return model.api === "openai-responses" || model.api === "openai-completions";
}

export default function (pi: ExtensionAPI) {
	let proEnabled = false;
	let flexEnabled = false;

	function updateStatus(ctx: ExtensionContext) {
		if (!ctx.hasUI) return;
		const parts: string[] = [];
		if (proEnabled) parts.push(supportsProMode(ctx.model) ? "pro" : "pro (inactive)");
		if (flexEnabled) parts.push(supportsFlexTier(ctx.model) ? "flex" : "flex (inactive)");
		ctx.ui.setStatus(STATUS_KEY, parts.length > 0 ? `openai: ${parts.join(", ")}` : undefined);
	}

	function restoreFromEntries(ctx: ExtensionContext) {
		for (const entry of ctx.sessionManager.getEntries()) {
			if (entry.type !== "custom") continue;
			const data = entry.data as { enabled?: boolean } | undefined;
			if (entry.customType === PRO_ENTRY_TYPE) proEnabled = data?.enabled === true;
			if (entry.customType === FLEX_ENTRY_TYPE) flexEnabled = data?.enabled === true;
		}
	}

	// Restore toggles when a session is started, resumed, or reloaded.
	pi.on("session_start", async (_event, ctx) => {
		restoreFromEntries(ctx);
		updateStatus(ctx);
	});

	// Keep the footer status honest when the model changes.
	pi.on("model_select", async (_event, ctx) => {
		updateStatus(ctx);
	});

	// Patch outgoing OpenAI requests.
	pi.on("before_provider_request", (event, ctx) => {
		const applyPro = proEnabled && supportsProMode(ctx.model);
		const applyFlex = flexEnabled && supportsFlexTier(ctx.model);
		if (!applyPro && !applyFlex) return;

		const payload = event.payload;
		if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return;

		const patched: Record<string, unknown> = { ...(payload as Record<string, unknown>) };

		if (applyPro) {
			const existing = patched.reasoning;
			patched.reasoning =
				typeof existing === "object" && existing !== null && !Array.isArray(existing)
					? { ...(existing as Record<string, unknown>), mode: "pro" }
					: { mode: "pro" };
		}

		if (applyFlex) {
			patched.service_tier = "flex";
		}

		return patched;
	});

	function registerToggleCommand(options: {
		command: string;
		label: string;
		entryType: string;
		isEnabled: () => boolean;
		setEnabled: (value: boolean) => void;
		isSupported: (model: ActiveModel) => boolean;
		requirement: string;
	}) {
		pi.registerCommand(options.command, {
			description: `Toggle ${options.label} (on|off|status; default: toggle)`,
			handler: async (args, ctx) => {
				const arg = (args ?? "").trim().toLowerCase();

				if (arg === "status") {
					ctx.ui.notify(
						`${options.label} is ${options.isEnabled() ? "ON" : "OFF"}` +
							(options.isEnabled() && !options.isSupported(ctx.model)
								? ` (inactive: ${options.requirement})`
								: ""),
						"info",
					);
					return;
				}

				const next = arg === "on" ? true : arg === "off" ? false : !options.isEnabled();
				options.setEnabled(next);
				pi.appendEntry(options.entryType, { enabled: next });
				updateStatus(ctx);

				if (next && !options.isSupported(ctx.model)) {
					const model = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "none";
					ctx.ui.notify(
						`${options.label} ON, but it will not apply to ${model}. Requires ${options.requirement}.`,
						"warning",
					);
				} else {
					ctx.ui.notify(`${options.label} ${next ? "ON" : "OFF"}`, "info");
				}
			},
		});
	}

	registerToggleCommand({
		command: "pro-reasoning",
		label: 'Pro reasoning mode (reasoning.mode: "pro")',
		entryType: PRO_ENTRY_TYPE,
		isEnabled: () => proEnabled,
		setEnabled: (value) => {
			proEnabled = value;
		},
		isSupported: supportsProMode,
		requirement: 'a gpt-5.6* model on the "openai" (API key) provider via the Responses API',
	});

	registerToggleCommand({
		command: "flex-tier",
		label: 'Flex tier (service_tier: "flex")',
		entryType: FLEX_ENTRY_TYPE,
		isEnabled: () => flexEnabled,
		setEnabled: (value) => {
			flexEnabled = value;
		},
		isSupported: supportsFlexTier,
		requirement: 'a model on the "openai" (API key) provider',
	});
}
