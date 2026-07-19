export interface AcceptanceExpectations {
  allItemsEqual?: Record<string, { field: string; value: unknown }>;
  allItemsHaveNonEmptyString?: Record<string, string>;
  equals?: Record<string, unknown>;
  expectedTheme: "dark" | "light";
  maximumValues?: Record<string, number>;
  minimumItems?: Record<string, number>;
  requiredFields?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function assertAcceptanceMetric(
  name: string,
  value: unknown,
  expectations: AcceptanceExpectations,
) {
  if (!isRecord(value)) {
    throw new Error(`${name} acceptance metrics were not an object`);
  }

  const failures: string[] = [];
  const bodyScrollWidth = value.bodyScrollWidth;
  const clientWidth = value.clientWidth;
  if (
    typeof bodyScrollWidth !== "number" ||
    typeof clientWidth !== "number" ||
    !Number.isFinite(bodyScrollWidth) ||
    !Number.isFinite(clientWidth)
  ) {
    failures.push("viewport widths were not finite numbers");
  } else if (bodyScrollWidth > clientWidth) {
    failures.push(
      `horizontal overflow was ${bodyScrollWidth - clientWidth}px`,
    );
  }

  if (value.resolvedTheme !== expectations.expectedTheme) {
    failures.push(
      `expected ${expectations.expectedTheme} theme, received ${String(value.resolvedTheme)}`,
    );
  }

  for (const field of expectations.requiredFields ?? []) {
    if (value[field] === null || value[field] === undefined) {
      failures.push(`${field} was missing`);
    }
  }

  for (const [field, expected] of Object.entries(expectations.equals ?? {})) {
    if (!Object.is(value[field], expected)) {
      failures.push(
        `${field} expected ${JSON.stringify(expected)}, received ${JSON.stringify(value[field])}`,
      );
    }
  }

  for (const [field, minimum] of Object.entries(
    expectations.minimumItems ?? {},
  )) {
    const items = value[field];
    if (!Array.isArray(items) || items.length < minimum) {
      failures.push(`${field} expected at least ${minimum} items`);
    }
  }

  for (const [field, maximum] of Object.entries(
    expectations.maximumValues ?? {},
  )) {
    const received = value[field];
    if (
      typeof received !== "number" ||
      !Number.isFinite(received) ||
      received > maximum
    ) {
      failures.push(
        `${field} expected at most ${maximum}, received ${JSON.stringify(received)}`,
      );
    }
  }

  for (const [field, itemExpectation] of Object.entries(
    expectations.allItemsEqual ?? {},
  )) {
    const items = value[field];
    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      items.some(
        (item) =>
          !isRecord(item) ||
          !Object.is(item[itemExpectation.field], itemExpectation.value),
      )
    ) {
      failures.push(
        `${field} did not keep ${itemExpectation.field}=${JSON.stringify(itemExpectation.value)}`,
      );
    }
  }

  for (const [field, itemField] of Object.entries(
    expectations.allItemsHaveNonEmptyString ?? {},
  )) {
    const items = value[field];
    if (
      !Array.isArray(items) ||
      items.length === 0 ||
      items.some(
        (item) =>
          !isRecord(item) ||
          typeof item[itemField] !== "string" ||
          item[itemField].trim().length === 0,
      )
    ) {
      failures.push(`${field} did not keep a non-empty ${itemField}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `${name} acceptance failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`,
    );
  }
}
