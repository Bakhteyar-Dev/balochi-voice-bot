"use client";

import { useState } from "react";

export default function Home() {
  const [audio, setAudio] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");

  return (
    <main style={{ maxWidth: 700, margin: "50px auto", padding: 20 }}>
      <h1>Balochi Voice Assistant</h1>

      <p>Upload a Balochi audio recording.</p>

      <input
        type="file"
        accept="audio/*"
        onChange={(e) => setAudio(e.target.files?.[0] || null)}
      />

      <br />
      <br />

      <button
        onClick={() => {
          setTranscript("Audio selected: " + (audio?.name || ""));
          setResponse("Gemini response will appear here later.");
        }}
        disabled={!audio}
      >
        Test Upload
      </button>

      {transcript && (
        <>
          <h3>Transcription</h3>
          <p>{transcript}</p>
        </>
      )}

      {response && (
        <>
          <h3>Assistant</h3>
          <p>{response}</p>
        </>
      )}
    </main>
  );
}