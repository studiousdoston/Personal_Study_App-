export type SpeechLang = "ko-KR" | "en-US";

export type SpeechSegment = { text: string; lang: SpeechLang };

const HANGUL = /[가-힣ᄀ-ᇿ㄰-㆏]/;
const LATIN = /[A-Za-zÀ-ɏ]/;

function languageOf(char: string): SpeechLang | null {
  if (HANGUL.test(char)) return "ko-KR";
  if (LATIN.test(char)) return "en-US";
  return null;
}

export function splitBySpeechLanguage(text: string): SpeechSegment[] {
  const segments: SpeechSegment[] = [];
  let leading = "";

  for (const char of text) {
    const lang = languageOf(char);
    const last = segments.at(-1);
    if (lang === null || last?.lang === lang) {
      if (last) last.text += char;
      else leading += char;
    } else {
      segments.push({ text: leading + char, lang });
      leading = "";
    }
  }

  if (segments.length === 0) {
    const trimmed = leading.trim();
    return trimmed ? [{ text: trimmed, lang: "en-US" }] : [];
  }
  return segments
    .map((segment) => ({ ...segment, text: segment.text.trim() }))
    .filter((segment) => segment.text !== "");
}
