"use client";

import { useRef, useState } from "react";

export default function Home() {
  const [audio, setAudio] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        const recordedFile = new File(
          [blob],
          "balochi-recording.webm",
          {
            type: blob.type || "audio/webm",
          }
        );

        setAudio(recordedFile);

        streamRef.current?.getTracks().forEach((track) => {
          track.stop();
        });

        streamRef.current = null;
      };

      recorder.start();
      setRecording(true);
    } catch (error) {
      console.error(error);
      alert(
        "Microphone access was denied. Please allow microphone access in your browser."
      );
    }
  }

  function stopRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }

    setRecording(false);
  }

  async function handleAudio() {
    if (!audio) return;

    setLoading(true);
    setTranscript("");
    setResponse("");

    try {
      const formData = new FormData();
      formData.append("audio", audio);

      const asrRes = await fetch(
        "https://bakhteyar-dev--balochi-asr-api-fastapi-app.modal.run/transcribe",
        {
          method: "POST",
          body: formData,
        }
      );

      const asrData = await asrRes.json();

      if (!asrRes.ok || !asrData.transcription) {
        throw new Error(
          asrData.error || "ASR transcription failed"
        );
      }

      const text = asrData.transcription;

      setTranscript(text);

      const geminiRes = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
        }),
      });

      const geminiData = await geminiRes.json();

      if (!geminiRes.ok) {
        throw new Error(
          geminiData.error || "Gemini request failed"
        );
      }

      setResponse(
        geminiData.response || "No response from Gemini"
      );
    } catch (error) {
      setResponse(
        error instanceof Error
          ? error.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 700,
        margin: "50px auto",
        padding: 20,
      }}
    >
      <h1>Balochi Voice Assistant</h1>

      <p>
        Speak in Balochi or upload an audio recording.
      </p>

      <h3>Record your voice</h3>

      {!recording ? (
        <button onClick={startRecording}>
          🎤 Start Recording
        </button>
      ) : (
        <button onClick={stopRecording}>
          ⏹ Stop Recording
        </button>
      )}

      {recording && (
        <p>
          🔴 Recording...
        </p>
      )}

      <hr style={{ margin: "30px 0" }} />

      <h3>Or upload audio</h3>

      <input
        type="file"
        accept="audio/*"
        onChange={(e) =>
          setAudio(e.target.files?.[0] || null)
        }
      />

      {audio && (
        <p>
          Selected audio: {audio.name}
        </p>
      )}

      <button
        onClick={handleAudio}
        disabled={!audio || loading || recording}
        style={{
          marginTop: 20,
          padding: "10px 20px",
        }}
      >
        {loading
          ? "Processing..."
          : "Ask Balochi Assistant"}
      </button>

      {transcript && (
        <>
          <h3>Transcription</h3>

          <div
            dir="rtl"
            style={{
              padding: 15,
              border: "1px solid #ccc",
              borderRadius: 8,
            }}
          >
            {transcript}
          </div>
        </>
      )}

      {response && (
        <>
          <h3>Assistant</h3>

          <div
            dir="rtl"
            style={{
              padding: 15,
              border: "1px solid #ccc",
              borderRadius: 8,
            }}
          >
            {response}
          </div>
        </>
      )}
    </main>
  );
}