import { describe, expect, it } from "vitest";
import {
  canMoveDemoRoute,
  createDemoRouteHistory,
  currentDemoRoute,
  moveDemoRoute,
  pushDemoRoute,
} from "../src/route-history";

describe("demo route history", () => {
  it("enables Back after Projects is pushed and restores it with Forward", () => {
    const home = createDemoRouteHistory("workspace");
    const projects = pushDemoRoute(home, "projects");

    expect(currentDemoRoute(projects)).toBe("projects");
    expect(canMoveDemoRoute(projects, -1)).toBe(true);
    expect(canMoveDemoRoute(projects, 1)).toBe(false);

    const restoredHome = moveDemoRoute(projects, -1);
    expect(currentDemoRoute(restoredHome)).toBe("workspace");
    expect(canMoveDemoRoute(restoredHome, 1)).toBe(true);
    expect(currentDemoRoute(moveDemoRoute(restoredHome, 1))).toBe("projects");
  });

  it("truncates Forward history after navigating from a restored route", () => {
    const projects = pushDemoRoute(
      createDemoRouteHistory("workspace"),
      "projects",
    );
    const restoredHome = moveDemoRoute(projects, -1);
    const pullRequests = pushDemoRoute(restoredHome, "pull-request");

    expect(pullRequests.entries).toEqual(["workspace", "pull-request"]);
    expect(canMoveDemoRoute(pullRequests, 1)).toBe(false);
  });

  it("does not duplicate the current route or move beyond either edge", () => {
    const history = createDemoRouteHistory("projects", ["workspace"]);

    expect(pushDemoRoute(history, "projects")).toBe(history);
    expect(moveDemoRoute(history, 1)).toBe(history);
    expect(moveDemoRoute(moveDemoRoute(history, -1), -1)).toEqual({
      entries: ["workspace", "projects"],
      index: 0,
    });
  });
});
