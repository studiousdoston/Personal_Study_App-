export function pluralWord(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}

export function plural(count: number, word: string): string {
  return `${count} ${pluralWord(count, word)}`;
}
