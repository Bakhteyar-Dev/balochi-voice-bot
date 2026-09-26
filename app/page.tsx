"use client";

import { useState } from "react";

export default function Home() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  async function askGemini() {
    if (!message.trim()) return;

    setLoading(true);
    setResponse("");

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: message,
      }),
    });

    const data = await res.json();

    if (data.response) {
      setResponse(data.response);
    } else {
      setResponse(data.error || "Something went wrong.");
    }

    setLoading(false);
  }

  return (
    <main style={{ maxWidth: 700, margin: "50px auto", padding: 20 }}>
      <h1>Balochi Voice Assistant</h1>

      <p>Type a message to test Gemini first.</p>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type here..."
        rows={5}
        style={{ width: "100%", padding: 10 }}
      />

      <br />
      <br />

      <button onClick={askGemini} disabled={loading}>
        {loading ? "Thinking..." : "Ask Gemini"}
      </button>

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