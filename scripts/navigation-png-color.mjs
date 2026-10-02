import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const execute = promisify(execFile);

export function navigationPngColorProfile(bytes) {
  assert.ok(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "Expected a PNG");
  let profile = null;
  for (let offset = 8; offset < bytes.length;) {
    assert.ok(offset + 12 <= bytes.length, "Truncated PNG chunk");
    const length = bytes.readUInt32BE(offset);
    assert.ok(offset + length + 12 <= bytes.length, "Invalid PNG chunk length");
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (type === "iCCP") {
      assert.equal(profile, null, "Duplicate PNG ICC profile");
      const data = bytes.subarray(offset + 8, offset + 8 + length);
      const end = data.indexOf(0);
      assert.ok(end > 0 && end <= 79 && end + 2 < data.length);
      assert.equal(data[end + 1], 0, "Unsupported ICC compression");
      const icc = inflateSync(data.subarray(end + 2), { maxOutputLength: 4096 });
      assert.ok(icc.length >= 128);
      assert.equal(icc.readUInt32BE(0), icc.length);
      assert.equal(icc.toString("ascii", 16, 20), "RGB ");
      profile = { name: data.toString("latin1", 0, end), bytes: icc.length, sha256: createHash("sha256").update(icc).digest("hex") };
    }
    offset += length + 12;
  }
  return profile;
}

/** PNGJS does not apply ICC transforms. Preserve source bytes, normalize only
 * the comparison raster. Untagged Chromium PNGs use the standard sRGB space. */
export async function normalizeNavigationPng(bytes) {
  if (!navigationPngColorProfile(bytes)) return bytes;
  assert.equal(process.platform, "darwin", "The native navigation gate requires macOS ColorSync");
  const directory = await mkdtemp(join(tmpdir(), "ui-kit-navigation-color-"));
  try {
    const input = join(directory, "input.png"), output = join(directory, "srgb.png");
    await writeFile(input, bytes, { flag: "wx" });
    await execute("/usr/bin/sips", ["--matchTo", "/System/Library/ColorSync/Profiles/sRGB Profile.icc", input, "--out", output], { maxBuffer: 4096 });
    return await readFile(output);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
