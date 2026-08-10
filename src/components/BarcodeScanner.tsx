"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { isValidGtinChecksum } from "@/lib/barcodeChecksum";

type BarcodeScannerProps = {
  active: boolean;
  onDetect: (barcode: string) => void;
};

const NATIVE_FORMATS: BarcodeFormatString[] = [
  "upc_a",
  "upc_e",
  "ean_13",
  "ean_8",
];

const ZXING_FORMATS = [
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
];

const REDETECT_WINDOW_MS = 3000;
const NATIVE_DETECT_INTERVAL_MS = 300;
const CONSENSUS_READS_REQUIRED = 2;
const CONSENSUS_WINDOW_MS = 1500;

export function BarcodeScanner({ active, onDetect }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDetectionRef = useRef<{ code: string; time: number } | null>(
    null
  );
  const consensusRef = useRef<{
    code: string;
    count: number;
    firstSeen: number;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const handleDetected = useCallback(
    (code: string) => {
      // A failed check digit almost always means the frame was misread
      // (blur, glare, a bad angle) rather than a real, unknown barcode.
      if (!isValidGtinChecksum(code)) return;

      const now = Date.now();
      const last = lastDetectionRef.current;
      if (last && last.code === code && now - last.time < REDETECT_WINDOW_MS) {
        return;
      }

      // Checksums only catch ~90% of misreads, so also require the same
      // code to be read twice in a row before acting on it — it's very
      // unlikely a bad read produces the identical wrong number twice.
      const previous = consensusRef.current;
      let entry: { code: string; count: number; firstSeen: number };
      if (
        previous &&
        previous.code === code &&
        now - previous.firstSeen < CONSENSUS_WINDOW_MS
      ) {
        previous.count += 1;
        entry = previous;
      } else {
        entry = { code, count: 1, firstSeen: now };
        consensusRef.current = entry;
        return;
      }

      if (entry.count < CONSENSUS_READS_REQUIRED) return;

      consensusRef.current = null;
      lastDetectionRef.current = { code, time: now };
      onDetect(code);
    },
    [onDetect]
  );

  useEffect(() => {
    if (!active) return;

    let cancelled = false;

    async function start() {
      setError(null);
      setReady(false);

      const video = videoRef.current;
      if (!video) return;

      const hasNativeDetector =
        typeof window !== "undefined" && "BarcodeDetector" in window;

      try {
        if (hasNativeDetector) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } },
            audio: false,
          });

          if (cancelled) {
            stream.getTracks().forEach((track) => track.stop());
            return;
          }

          streamRef.current = stream;
          video.srcObject = stream;
          await video.play();
          setReady(true);

          const detector = new window.BarcodeDetector!({
            formats: NATIVE_FORMATS,
          });

          intervalRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.readyState < 2) return;
            try {
              const results = await detector.detect(videoRef.current);
              if (results.length > 0) handleDetected(results[0].rawValue);
            } catch {
              // ignore transient per-frame decode failures
            }
          }, NATIVE_DETECT_INTERVAL_MS);
        } else {
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS);
          const reader = new BrowserMultiFormatReader(hints);

          const controls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: "environment" } }, audio: false },
            video,
            (result) => {
              if (result) handleDetected(result.getText());
            }
          );

          if (cancelled) {
            controls.stop();
            return;
          }

          zxingControlsRef.current = controls;
          setReady(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to access the camera."
          );
        }
      }
    }

    start();

    return () => {
      cancelled = true;

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (zxingControlsRef.current) {
        zxingControlsRef.current.stop();
        zxingControlsRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [active, handleDetected]);

  return (
    <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden rounded-2xl bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        muted
        playsInline
      />
      {!ready && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
          Starting camera…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-6 text-center text-sm text-red-300">
          {error}
        </div>
      )}
      {ready && !error && (
        <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-white/70" />
      )}
    </div>
  );
}
