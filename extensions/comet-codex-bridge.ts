import { randomUUID } from "node:crypto";
import {
  chmod,
  open,
  readFile,
  rename as renameFile,
  stat,
  unlink,
} from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export const COMET_CODEX_WIDGET_KEY = "comet.pi-codex.v1";

export const WEB_SEARCH_MODELS = [
  "gpt-5.6-luna",
  "gpt-5.6-terra",
  "gpt-5.6-sol",
  "gpt-5.5",
  "gpt-5.4-mini",
  "gpt-5.3-codex-spark",
] as const;

type JsonObject = Record<string, unknown>;

export interface SettingUpdate {
  key: string;
  rawPath: readonly string[];
  value: boolean | string | number;
}

type AtomicWriteOperations = {
  rename?: (oldPath: string, newPath: string) => Promise<void>;
};

type BridgeOptions = {
  configPath?: string;
};

const BOOLEAN_SETTINGS: Readonly<Record<string, readonly string[]>> = {
  voiceFeaturesOnly: ["voiceFeaturesOnly"],
  "prompt.heavySystemPromptOverwrite": ["prompt", "heavySystemPromptOverwrite"],
  "tools.webRun": ["tools", "webRun"],
  "tools.imageGeneration": ["tools", "imageGeneration"],
  "tools.viewImageFallback": ["tools", "viewImageFallback"],
  "tools.applyPatchOnly": ["tools", "applyPatchOnly"],
  "tools.viewImageOnly": ["tools", "viewImageOnly"],
  "tools.webRunOnly": ["tools", "webRunOnly"],
  "tools.imageGenerationOnly": ["tools", "imageGenerationOnly"],
  "display.statusLine": ["ui", "statusLine"],
  "display.toolRenaming": ["ui", "toolRenaming"],
  "display.compactTools": ["ui", "compactTools"],
  "display.codeModeDetails": ["ui", "codeModeDetails"],
  "display.backgroundShellWidget": ["ui", "backgroundShellWidget"],
  "compaction.responsesCompaction": ["compaction", "responsesCompaction"],
  "beta.codeMode": ["beta", "codeMode"],
  "beta.responsesLite": ["beta", "responsesLite"],
  "openai.fast": ["openai", "fast"],
  "openai.forceCachedWebSockets": ["openai", "forceCachedWebSockets"],
  "openai.harnessIdentifierHeader": ["openai", "harnessIdentifierHeader"],
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function child(value: JsonObject, key: string): JsonObject {
  return isObject(value[key]) ? value[key] : {};
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function oneOf<T extends string>(
  value: unknown,
  values: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && values.includes(value as T)
    ? (value as T)
    : fallback;
}

export function buildCodexSnapshot(raw: unknown) {
  const root = isObject(raw) ? raw : {};
  const prompt = child(root, "prompt");
  const scope = child(root, "scope");
  const tools = child(root, "tools");
  const ui = child(root, "ui");
  const compaction = child(root, "compaction");
  const beta = child(root, "beta");
  const openai = child(root, "openai");
  const allProviders =
    scope.allProviders === true
      ? "on"
      : scope.allProviders === false
        ? "off"
        : oneOf(scope.allProviders, ["off", "on", "extras"] as const, "off");
  const verbosity =
    typeof openai.verbosity === "string"
      ? oneOf(
          openai.verbosity.trim().toLowerCase(),
          ["low", "medium", "high"] as const,
          "low",
        )
      : "low";
  const toolRenaming = bool(ui.toolRenaming, bool(ui.toolRendering, true));

  return {
    version: 1 as const,
    settings: {
      voiceFeaturesOnly: bool(root.voiceFeaturesOnly, false),
      prompt: {
        heavySystemPromptOverwrite: bool(
          prompt.heavySystemPromptOverwrite,
          false,
        ),
      },
      scope: { allProviders },
      tools: {
        webRun: bool(tools.webRun, true),
        imageGeneration: bool(tools.imageGeneration, true),
        viewImageFallback: bool(tools.viewImageFallback, false),
        applyPatchOnly: bool(tools.applyPatchOnly, false),
        viewImageOnly: bool(tools.viewImageOnly, false),
        webRunOnly: bool(tools.webRunOnly, false),
        imageGenerationOnly: bool(tools.imageGenerationOnly, false),
      },
      display: {
        statusLine: bool(ui.statusLine, true),
        toolRenaming,
        compactTools: bool(ui.compactTools, false),
        codeModeDetails: bool(ui.codeModeDetails, false),
        backgroundShellWidget: bool(ui.backgroundShellWidget, true),
      },
      compaction: {
        responsesCompaction: bool(compaction.responsesCompaction, false),
        v2UserMessageRetention:
          beta.v2UserMessageRetention === 16 ||
          beta.v2UserMessageRetention === 32 ||
          beta.v2UserMessageRetention === 64
            ? beta.v2UserMessageRetention
            : 64,
      },
      beta: {
        codeMode: bool(beta.codeMode, false),
        responsesLite: bool(beta.responsesLite, false),
      },
      openai: {
        fast: bool(openai.fast, false),
        verbosity,
        forceCachedWebSockets: bool(openai.forceCachedWebSockets, true),
        harnessIdentifierHeader: bool(openai.harnessIdentifierHeader, false),
        webSearchModel: oneOf(
          openai.webSearchModel,
          WEB_SEARCH_MODELS,
          "gpt-5.6-luna",
        ),
      },
    },
  };
}

export function parseSettingArguments(args: string): SettingUpdate | undefined {
  const parts = args.trim() ? args.trim().split(/\s+/) : [];
  if (parts.length !== 2) return undefined;
  const [key, commandValue] = parts as [string, string];
  const booleanPath = BOOLEAN_SETTINGS[key];
  if (booleanPath) {
    if (commandValue !== "on" && commandValue !== "off") return undefined;
    return { key, rawPath: booleanPath, value: commandValue === "on" };
  }

  const enums: Readonly<Record<string, readonly string[]>> = {
    "scope.allProviders": ["off", "on", "extras"],
    "openai.verbosity": ["low", "medium", "high"],
    "openai.webSearchModel": WEB_SEARCH_MODELS,
    "compaction.v2UserMessageRetention": ["16", "32", "64"],
  };
  const values = enums[key];
  if (!values?.includes(commandValue)) return undefined;
  const rawPath =
    key === "compaction.v2UserMessageRetention"
      ? ["beta", "v2UserMessageRetention"]
      : key.split(".");
  return {
    key,
    rawPath,
    value:
      key === "compaction.v2UserMessageRetention"
        ? Number(commandValue)
        : commandValue,
  };
}

async function readConfigDocument(
  configPath: string,
): Promise<{ raw: JsonObject; mode: number }> {
  let document: string;
  let mode = 0o600;
  try {
    const metadata = await stat(configPath);
    if (!metadata.isFile()) throw new Error("Config is not a regular file");
    mode = metadata.mode & 0o7777;
    document = await readFile(configPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { raw: {}, mode };
    }
    throw error;
  }

  const parsed: unknown = JSON.parse(document);
  if (!isObject(parsed)) throw new Error("Config root is not an object");
  return { raw: parsed, mode };
}

function patchSetting(raw: JsonObject, update: SettingUpdate): boolean {
  let parent = raw;
  for (const segment of update.rawPath.slice(0, -1)) {
    const existing = parent[segment];
    if (existing === undefined) {
      const created: JsonObject = {};
      parent[segment] = created;
      parent = created;
      continue;
    }
    if (!isObject(existing)) {
      throw new Error("Mapped parent is not an object");
    }
    parent = existing;
  }
  const leaf = update.rawPath.at(-1);
  if (!leaf) throw new Error("Empty setting path");
  if (Object.is(parent[leaf], update.value)) return false;
  parent[leaf] = update.value;
  return true;
}

export async function atomicWriteText(
  targetPath: string,
  text: string,
  mode: number,
  operations: AtomicWriteOperations = {},
): Promise<void> {
  const directory = dirname(targetPath);
  const temporaryPath = join(
    directory,
    `.${basename(targetPath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  const rename = operations.rename ?? renameFile;
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(temporaryPath, "wx", mode);
    await handle.writeFile(text, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await chmod(temporaryPath, mode);
    await rename(temporaryPath, targetPath);
  } catch (error) {
    if (handle) {
      try {
        await handle.close();
      } catch {
        // Preserve the original failure.
      }
    }
    try {
      await unlink(temporaryPath);
    } catch {
      // The temp may not have been created or may already have been renamed.
    }
    throw error;
  }
}

export async function updateCodexConfigFile(
  configPath: string,
  update: SettingUpdate,
): Promise<JsonObject> {
  const { raw, mode } = await readConfigDocument(configPath);
  const changed = patchSetting(raw, update);
  if (!changed) return (await readConfigDocument(configPath)).raw;
  await atomicWriteText(configPath, `${JSON.stringify(raw, null, 2)}\n`, mode);
  return (await readConfigDocument(configPath)).raw;
}

function defaultConfigPath(): string {
  const agentDirectory =
    process.env.PI_CODING_AGENT_DIR ?? join(homedir(), ".pi", "agent");
  return join(agentDirectory, "pi-codex-conversion.json");
}

export function createCometCodexBridge(
  pi: ExtensionAPI,
  options: BridgeOptions = {},
): void {
  const configPath = options.configPath ?? defaultConfigPath();
  let lastPayload: string | null = null;

  const notifyUnavailable = (ctx: any): void => {
    ctx.ui.notify("Codex settings are unavailable.", "error");
  };

  const emitRaw = (ctx: any, raw: JsonObject): void => {
    if (ctx.mode !== "rpc") return;
    const payload = JSON.stringify(buildCodexSnapshot(raw));
    if (payload === lastPayload) return;
    ctx.ui.setWidget(COMET_CODEX_WIDGET_KEY, [payload], {
      placement: "aboveEditor",
    });
    lastPayload = payload;
  };

  const refresh = async (ctx: any): Promise<void> => {
    if (ctx.mode !== "rpc") return;
    try {
      emitRaw(ctx, (await readConfigDocument(configPath)).raw);
    } catch {
      notifyUnavailable(ctx);
    }
  };

  pi.on("session_start", async (_event, ctx) => {
    if (ctx.mode !== "rpc") return;
    lastPayload = null;
    await refresh(ctx);
  });

  pi.on("before_agent_start", async (_event, ctx) => {
    await refresh(ctx);
  });

  pi.registerCommand("comet-codex-set", {
    description: "Set one allowlisted Codex conversion setting",
    handler: async (args, ctx) => {
      const update = parseSettingArguments(args);
      if (!update) {
        ctx.ui.notify("Unable to update Codex settings.", "error");
        return;
      }
      try {
        const raw = await updateCodexConfigFile(configPath, update);
        emitRaw(ctx, raw);
        ctx.ui.notify(
          "Codex setting updated. It applies on the next Pi session.",
          "info",
        );
      } catch {
        ctx.ui.notify("Unable to update Codex settings.", "error");
      }
    },
  });
}

export default function cometCodexBridge(pi: ExtensionAPI): void {
  createCometCodexBridge(pi);
}
