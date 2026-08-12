export function trimBranchInputAsciiWhitespace(value: string) {
  return value.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, "");
}
