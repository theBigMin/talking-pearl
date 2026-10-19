import { useCallback, useEffect, useRef } from 'react';

type Handlers = {
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
  onIdleTimeout: () => void;
};

const POLL_MS = 50;
const MIN_SPEECH_MS = 250; // loud this long = the person is talking
const END_SILENCE_MS = 900; // quiet this long = they stopped talking
const IDLE_MS = 7000; // no talking this long = Pearl hangs up
const MIN_LEVEL = 0.035;

/** Listens to the microphone and reports when the person starts and stops talking. */
export function useVoiceActivity(handlers: Handlers) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const stream = useRef<MediaStream | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const listening = useRef(false);
  const state = useRef({ floor: 0.01, loudMs: 0, silentMs: 0, idleMs: 0, speaking: false });

  const stop = useCallback(() => {
    listening.current = false;
    if (poll.current) clearInterval(poll.current);
    poll.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void audio.current?.close();
    audio.current = null;
  }, []);

  const start = useCallback(async () => {
    stop();
    const media = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
    const ctx = new AudioContext();
    await ctx.resume();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(media).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    stream.current = media;
    audio.current = ctx;

    poll.current = setInterval(() => {
      if (!listening.current) return;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += v * v;
      const rms = Math.sqrt(sum / buf.length);

      const s = state.current;
      const loud = rms > Math.max(MIN_LEVEL, s.floor * 3);
      if (loud) {
        s.loudMs += POLL_MS;
        s.silentMs = 0;
      } else {
        s.floor = s.floor * 0.95 + rms * 0.05; // learn the room's background noise
        s.silentMs += POLL_MS;
        if (!s.speaking) s.loudMs = 0;
      }

      if (!s.speaking && s.loudMs >= MIN_SPEECH_MS) {
        s.speaking = true;
        s.idleMs = 0;
        handlersRef.current.onSpeechStart();
      } else if (s.speaking && s.silentMs >= END_SILENCE_MS) {
        s.speaking = false;
        s.loudMs = 0;
        handlersRef.current.onSpeechEnd();
      } else if (!s.speaking) {
        s.idleMs += POLL_MS;
        if (s.idleMs >= IDLE_MS) handlersRef.current.onIdleTimeout();
      }
    }, POLL_MS);
  }, [stop]);

  /** Turn listening on or off (off while Pearl is reacting). Resets the counters. */
  const setListening = useCallback((on: boolean) => {
    listening.current = on;
    state.current = { ...state.current, loudMs: 0, silentMs: 0, idleMs: 0, speaking: false };
  }, []);

  useEffect(() => stop, [stop]);

  return { start, stop, setListening };
}
