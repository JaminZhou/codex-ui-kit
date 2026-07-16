import { describe, expect, it } from "vitest";
import { highlightCode } from "../src/highlightCode";

describe("default code highlighter", () => {
  it("escapes source markup before returning highlighted HTML", () => {
    const result = highlightCode('<button onclick="run()">go</button>', "html");

    expect(result.code).toBe('<button onclick="run()">go</button>');
    expect(result.html).toContain("&lt;");
    expect(result.html).not.toContain("<button");
    expect(result.language).toBe("html");
  });

  it("supports sampled language aliases", () => {
    expect(highlightCode("const ready = true;", "ts").language).toBe("ts");
    expect(highlightCode("Plot[x, {x, 0, 1}]", "wolfram").language).toBe(
      "wolfram",
    );
  });

  it("rejects unknown language labels for plaintext fallback", () => {
    expect(() => highlightCode("plain text", "not-a-language")).toThrow(
      "Unknown language: not-a-language",
    );
  });
});
