// Shared mic-access helpers for voice practice recording (see
// LogVoiceSessionSheet) and the live pitch view (see LivePitchView) - kept
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

export async function requestMicStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ audio: true });
}

export function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}
