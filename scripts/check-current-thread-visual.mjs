process.argv.push(
  "--scenes=current-thread-completed,current-thread-completed-compact",
);
await import("./check-visual-scenarios.mjs");
