/* @vitest-environment happy-dom */

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import {
  SurfaceBlockedContext,
  useSurfaceBlockState,
} from "../src/internal/surfaceBlocked";

describe("surface block state", () => {
  it("blocks portals before a blocking render can paint", () => {
    function Probe() {
      const { portalsBlocked } = useSurfaceBlockState();
      return <output>{portalsBlocked ? "blocked" : "open"}</output>;
    }

    function Fixture({ blocked }: { blocked: boolean }) {
      return (
        <SurfaceBlockedContext.Provider value={blocked}>
          <Probe />
        </SurfaceBlockedContext.Provider>
      );
    }

    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    flushSync(() => root.render(<Fixture blocked={false} />));
    flushSync(() => root.render(<Fixture blocked />));

    expect(host.textContent).toBe("blocked");
    root.unmount();
    host.remove();
  });
});
