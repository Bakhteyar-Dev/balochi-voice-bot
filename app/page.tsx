"use client";

import { useState } from "react";

export default function Home() {
  const [audio, setAudio] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAudio() {
    if (!audio) return;

    setLoading(true);
    setTranscript("");
    setResponse("");

    try {
      // 1. Send audio to your Modal ASR API
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
        throw new Error(asrData.error || "ASR transcription failed");
      }

      const text = asrData.transcription;

      setTranscript(text);

      // 2. Send transcription to Gemini API route
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
        throw new Error(geminiData.error || "Gemini request failed");
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
        Upload a Balochi audio recording and receive a Balochi response.
      </p>

      <input
        type="file"
        accept="audio/*"
        onChange={(e) =>
          setAudio(e.target.files?.[0] || null)
        }
      />

      <br />
      <br />

      <button
        onClick={handleAudio}
        disabled={!audio || loading}
      >
        {loading ? "Processing..." : "Ask"}
      </button>

      {transcript && (
        <>
          <h3>Transcription</h3>

          <div
            dir="rtl"
            style={{
              marginTop: 10,
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
              marginTop: 10,
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