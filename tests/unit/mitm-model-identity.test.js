import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { resolveMappedModel } = require("../../src/mitm/modelMapping.js");
const { extractModel } = require("../../src/mitm/config.js");

describe("Antigravity preserves model identity", () => {
  const aliases = { "gemini-3.8-flash-high": "ag/high", "gemini-3.8-flash-medium": "ag/medium", "gemini-3.8-flash-low": "ag/low" };
  it("does not match a shortened request to the first high mapping", () => {
    expect(resolveMappedModel("antigravity", "gemini-3.8-flash", aliases)).toBe("ag/medium");
  });
  it("does not remap unknown preview/background or another version by /flash/", () => {
    for (const model of ["gemini-3.9-flash-medium", "flash-preview", "tab_flash_lite_preview"])
      expect(resolveMappedModel("antigravity", model, aliases)).toBeNull();
  });
  it("keeps explicit and legacy mappings", () => {
    expect(resolveMappedModel("antigravity", "models/gemini-3.8-flash-low", aliases)).toBe("ag/low");
    expect(resolveMappedModel("antigravity", "gemini-3.5-flash-low", { "gemini-3.5-flash-low": "ag/legacy" })).toBe("ag/legacy");
    expect(resolveMappedModel("antigravity", "custom-preview", { "custom-preview": "custom/model" })).toBe("custom/model");
  });
  it.each(["HIGH", "MEDIUM", "LOW"])("reads %s from a tiered or base model", level => {
    for (const model of ["gemini-3.8-flash", "gemini-3.8-flash-tiered"])
      expect(extractModel("/v1internal:streamGenerateContent", Buffer.from(JSON.stringify({model, request:{generationConfig:{thinkingConfig:{thinkingLevel:level}}}}))))
        .toBe(`gemini-3.8-flash-${level.toLowerCase()}`);
  });
  it("defaults a base flash request without thinkingLevel to medium", () => {
    expect(extractModel("/", Buffer.from('{"model":"gemini-3.8-flash"}'))).toBe("gemini-3.8-flash-medium");
  });
});
