/**
 * Utility that removes every linebreak.
 */
export function codeFormatter (code: string): string {
  return code.trim()
    .replace(/\n/g, "")
    .replace(/  /g, "")
}
