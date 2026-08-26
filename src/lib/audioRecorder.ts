// Shared mic-access helpers for voice practice recording (see
// LogVoiceSessionSheet) and the live pitch view (see care/voice/live) - kept
// small and separate from either feature's own logic.

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  );
}

export function isLiveAnalysisSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof AudioContext !== "undefined"
  );
}

// Plain mic access, browser defaults, for recording a practice session that
// somebody is going to listen back to. The browser's clean-up is welcome here:
// it is the same processing that makes a voice note sound tidy.
export async function requestMicStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true });
}

// Mic access for ANALYSIS, which wants the opposite of the above.
//
// getUserMedia({ audio: true }) turns on echo cancellation and noise
// suppression by default. Both are built for speech being transmitted to
// another person: they subtract what they judge to be noise, and in doing so
// they alter the harmonic structure that pitch detection reads. On phones
// especially, noise suppression will gate a quiet voice down towards nothing.
// So they are switched off, and the audio arrives as the microphone heard it.
//
// Automatic gain is left ON deliberately. It lifts a quiet voice to a usable
// level, and since the detector now measures periodicity rather than
// loudness, gain drifting around does not mislead it the way it would have
// misled the old amplitude-gated version.
export async function requestAnalysisStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
      },
    });
  } catch {
    // Some browsers reject unknown or unsupported constraints outright rather
    // than ignoring them. A working stream matters more than a pristine one.
    return navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

export function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}
