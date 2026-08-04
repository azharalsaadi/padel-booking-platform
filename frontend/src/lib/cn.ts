/** Joins class names, dropping falsy values. No dedupe/merge — deliberately simple. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
