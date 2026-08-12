export function trimBranchInputAsciiWhitespace(value: string) {
  const isPadding = (character: string) =>
    character === "\t" ||
    character === "\n" ||
    character === "\f" ||
    character === "\r" ||
    character === " ";
  let start = 0;
  let end = value.length;
  while (start < end && isPadding(value[start] ?? "")) start += 1;
  while (end > start && isPadding(value[end - 1] ?? "")) end -= 1;
  return value.slice(start, end);
}
