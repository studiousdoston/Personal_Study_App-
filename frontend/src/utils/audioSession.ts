export type AudioSessionType = "ambient" | "playback";

type NavigatorWithAudioSession = Navigator & { audioSession?: { type: string } };

export function setAudioSessionType(type: AudioSessionType) {
  try {
    const { audioSession } = navigator as NavigatorWithAudioSession;
    if (audioSession) audioSession.type = type;
  } catch {
    // older browsers without audioSession
  }
}
