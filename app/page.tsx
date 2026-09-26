"use client";

import { useRef, useState } from "react";

export default function Home() {
  const [audio, setAudio] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  async function startRecording() {
    try {
      setError("");
      setTranscript("");
      setResponse("");
      setAudio(null);

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
    } catch {
      setError(
        "Microphone access was denied. Please allow microphone permission."
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
    setError("");

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
        geminiData.response || "No response from Gemini."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function clearConversation() {
    setAudio(null);
    setTranscript("");
    setResponse("");
    setError("");
  }

  return (
    <main className="page">
      <div className="backgroundGlow glowOne"></div>
      <div className="backgroundGlow glowTwo"></div>

      <nav className="navbar">
        <div className="brand">
          <div className="brandIcon">B</div>

          <div>
            <div className="brandName">Balochi AI</div>
            <div className="brandSub">Voice Assistant</div>
          </div>
        </div>

        <div className="developer">
          Built by{" "}
          <span className="developerName">
            Bakhteyar Ghafoor
          </span>
        </div>
      </nav>

      <section className="hero">
        <div className="badge">
          ✦ AI Powered Balochi Assistant
        </div>

        <h1>
          Speak Balochi.
          <br />
          <span>Get intelligent answers.</span>
        </h1>

        <p className="heroText">
          A voice-powered Balochi AI assistant that understands
          your speech, converts it into text, and responds naturally
          in Balochi.
        </p>
      </section>

      <section className="assistantCard">
        <div className="cardHeader">
          <div>
            <h2>Balochi Voice Assistant</h2>
            <p>Speak naturally in Balochi</p>
          </div>

          <div className="onlineStatus">
            <span className="onlineDot"></span>
            Online
          </div>
        </div>

        <div className="voiceArea">
          <div
            className={`micOuter ${
              recording ? "recording" : ""
            }`}
          >
            <button
              className={`micButton ${
                recording ? "micRecording" : ""
              }`}
              onClick={
                recording ? stopRecording : startRecording
              }
              disabled={loading}
            >
              {recording ? (
                <span className="stopIcon">■</span>
              ) : (
                <span className="micIcon">🎙️</span>
              )}
            </button>
          </div>

          <h3>
            {recording
              ? "Listening..."
              : audio
              ? "Voice recording ready"
              : "Tap the microphone to speak"}
          </h3>

          <p>
            {recording
              ? "Speak clearly in Balochi"
              : audio
              ? "Your recording is ready to process"
              : "Your voice will be processed by the Balochi speech model"}
          </p>

          {recording && (
            <div className="wave">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
          )}
        </div>

        <div className="divider">
          <span></span>
          <p>OR</p>
          <span></span>
        </div>

        <label className="uploadBox">
          <div className="uploadIcon">↑</div>

          <div>
            <strong>Upload audio file</strong>
            <p>MP3, WAV, M4A or WebM</p>
          </div>

          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              setAudio(e.target.files?.[0] || null);
              setTranscript("");
              setResponse("");
              setError("");
            }}
          />
        </label>

        {audio && (
          <div className="selectedFile">
            <div className="fileIcon">♫</div>

            <div className="fileInfo">
              <strong>{audio.name}</strong>
              <span>
                {(audio.size / 1024).toFixed(1)} KB
              </span>
            </div>

            <div className="readyBadge">Ready</div>
          </div>
        )}

        <button
          className="processButton"
          onClick={handleAudio}
          disabled={!audio || loading || recording}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Processing your voice...
            </>
          ) : (
            <>
              <span>✦</span>
              Ask Balochi Assistant
            </>
          )}
        </button>

        {error && (
          <div className="errorBox">
            <span>!</span>
            {error}
          </div>
        )}
      </section>

      {(transcript || response) && (
        <section className="conversation">
          <div className="conversationHeader">
            <div>
              <span className="sectionLabel">
                CONVERSATION
              </span>
              <h2>Your Balochi Conversation</h2>
            </div>

            <button
              className="clearButton"
              onClick={clearConversation}
            >
              Clear
            </button>
          </div>

          {transcript && (
            <div className="messageRow userRow">
              <div className="avatar userAvatar">
                You
              </div>

              <div className="messageContent">
                <div className="messageTitle">
                  Your transcription
                </div>

                <div
                  className="messageBubble userBubble"
                  dir="rtl"
                >
                  {transcript}
                </div>
              </div>
            </div>
          )}

          {response && (
            <div className="messageRow assistantRow">
              <div className="avatar aiAvatar">
                AI
              </div>

              <div className="messageContent">
                <div className="messageTitle">
                  Balochi Assistant
                </div>

                <div
                  className="messageBubble aiBubble"
                  dir="rtl"
                >
                  {response}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="features">
        <div className="featureCard">
          <div className="featureIcon">🎙</div>
          <h3>Balochi Speech</h3>
          <p>
            Speak naturally using your microphone.
          </p>
        </div>

        <div className="featureCard">
          <div className="featureIcon">◈</div>
          <h3>AI Transcription</h3>
          <p>
            Powered by a custom Balochi Whisper model.
          </p>
        </div>

        <div className="featureCard">
          <div className="featureIcon">✦</div>
          <h3>Smart Answers</h3>
          <p>
            Receive natural Balochi responses powered by AI.
          </p>
        </div>
      </section>

      <footer>
        <div className="footerLogo">
          <div className="smallLogo">B</div>
          Balochi AI
        </div>

        <p>
          Designed & developed by{" "}
          <strong>Bakhteyar Ghafoor</strong>
        </p>

        <p className="footerSmall">
          Balochi Voice Intelligence Project © 2026
        </p>
      </footer>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 10% 10%,
              rgba(75, 70, 229, 0.16),
              transparent 32%
            ),
            radial-gradient(
              circle at 90% 30%,
              rgba(13, 148, 136, 0.16),
              transparent 32%
            ),
            linear-gradient(
              180deg,
              #07111f 0%,
              #081525 45%,
              #050b14 100%
            );
          color: #f8fafc;
          font-family:
            Arial,
            Helvetica,
            sans-serif;
          overflow: hidden;
          position: relative;
        }

        .backgroundGlow {
          position: absolute;
          border-radius: 999px;
          filter: blur(120px);
          pointer-events: none;
          opacity: 0.3;
        }

        .glowOne {
          width: 400px;
          height: 400px;
          background: #4f46e5;
          left: -200px;
          top: 300px;
        }

        .glowTwo {
          width: 400px;
          height: 400px;
          background: #0d9488;
          right: -220px;
          top: 700px;
        }

        .navbar {
          max-width: 1180px;
          margin: auto;
          padding: 28px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 2;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brandIcon {
          width: 44px;
          height: 44px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 800;
          background: linear-gradient(
            135deg,
            #6366f1,
            #14b8a6
          );
          box-shadow: 0 8px 30px rgba(99, 102, 241, 0.3);
        }

        .brandName {
          font-size: 18px;
          font-weight: 800;
        }

        .brandSub {
          color: #94a3b8;
          font-size: 12px;
          margin-top: 2px;
        }

        .developer {
          color: #94a3b8;
          font-size: 14px;
        }

        .developerName {
          color: #ffffff;
          font-weight: 700;
        }

        .hero {
          max-width: 850px;
          margin: 65px auto 45px;
          text-align: center;
          padding: 0 20px;
          position: relative;
          z-index: 2;
        }

        .badge {
          display: inline-block;
          padding: 9px 16px;
          border: 1px solid rgba(99, 102, 241, 0.35);
          background: rgba(99, 102, 241, 0.1);
          color: #c7d2fe;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.3px;
          margin-bottom: 24px;
        }

        .hero h1 {
          font-size: clamp(42px, 7vw, 72px);
          line-height: 1.04;
          margin: 0;
          font-weight: 800;
          letter-spacing: -2px;
        }

        .hero h1 span {
          background: linear-gradient(
            90deg,
            #818cf8,
            #2dd4bf
          );
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .heroText {
          color: #9caabd;
          font-size: 18px;
          line-height: 1.7;
          max-width: 680px;
          margin: 24px auto 0;
        }

        .assistantCard {
          max-width: 720px;
          margin: 0 auto;
          padding: 30px;
          border-radius: 28px;
          position: relative;
          z-index: 2;
          background: rgba(15, 27, 44, 0.82);
          border: 1px solid rgba(148, 163, 184, 0.12);
          box-shadow:
            0 35px 80px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
        }

        .cardHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 25px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }

        .cardHeader h2 {
          margin: 0;
          font-size: 21px;
        }

        .cardHeader p {
          margin: 7px 0 0;
          color: #8291a6;
          font-size: 13px;
        }

        .onlineStatus {
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(34, 197, 94, 0.08);
          color: #86efac;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .onlineDot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 12px #22c55e;
        }

        .voiceArea {
          padding: 44px 10px 30px;
          text-align: center;
        }

        .micOuter {
          width: 126px;
          height: 126px;
          border-radius: 50%;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(99, 102, 241, 0.09);
          border: 1px solid rgba(99, 102, 241, 0.15);
          transition: all 0.3s ease;
        }

        .micOuter.recording {
          animation: pulseRing 1.5s infinite;
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.25);
        }

        .micButton {
          width: 90px;
          height: 90px;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          background: linear-gradient(
            135deg,
            #6366f1,
            #14b8a6
          );
          box-shadow: 0 16px 45px rgba(79, 70, 229, 0.35);
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .micButton:hover {
          transform: scale(1.06);
          box-shadow: 0 20px 55px rgba(45, 212, 191, 0.3);
        }

        .micRecording {
          background: linear-gradient(
            135deg,
            #ef4444,
            #f97316
          );
        }

        .micIcon {
          font-size: 37px;
        }

        .stopIcon {
          color: white;
          font-size: 28px;
        }

        .voiceArea h3 {
          margin: 0;
          font-size: 19px;
        }

        .voiceArea p {
          margin-top: 9px;
          color: #7f8fa4;
          font-size: 13px;
        }

        .wave {
          height: 35px;
          margin: 25px auto 0;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 5px;
        }

        .wave span {
          width: 4px;
          border-radius: 10px;
          background: #ef4444;
          animation: wave 0.8s infinite ease-in-out;
        }

        .wave span:nth-child(1) {
          height: 12px;
        }

        .wave span:nth-child(2) {
          height: 25px;
          animation-delay: 0.1s;
        }

        .wave span:nth-child(3) {
          height: 18px;
          animation-delay: 0.2s;
        }

        .wave span:nth-child(4) {
          height: 33px;
          animation-delay: 0.3s;
        }

        .wave span:nth-child(5) {
          height: 20px;
          animation-delay: 0.4s;
        }

        .wave span:nth-child(6) {
          height: 28px;
          animation-delay: 0.5s;
        }

        .wave span:nth-child(7) {
          height: 13px;
          animation-delay: 0.6s;
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 13px;
          color: #5f6f84;
          margin: 4px 0 20px;
        }

        .divider span {
          height: 1px;
          background: rgba(148, 163, 184, 0.12);
          flex: 1;
        }

        .divider p {
          font-size: 11px;
        }

        .uploadBox {
          border: 1px dashed rgba(148, 163, 184, 0.25);
          background: rgba(255, 255, 255, 0.015);
          min-height: 95px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          padding: 20px;
          gap: 17px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .uploadBox:hover {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.05);
        }

        .uploadIcon {
          width: 45px;
          height: 45px;
          border-radius: 13px;
          background: rgba(99, 102, 241, 0.12);
          color: #a5b4fc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .uploadBox strong {
          font-size: 14px;
        }

        .uploadBox p {
          margin: 5px 0 0;
          color: #6e7f95;
          font-size: 12px;
        }

        .uploadBox input {
          display: none;
        }

        .selectedFile {
          margin-top: 14px;
          padding: 14px;
          border-radius: 14px;
          background: rgba(45, 212, 191, 0.05);
          border: 1px solid rgba(45, 212, 191, 0.1);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .fileIcon {
          width: 37px;
          height: 37px;
          border-radius: 10px;
          background: rgba(45, 212, 191, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fileInfo {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
          overflow: hidden;
        }

        .fileInfo strong {
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .fileInfo span {
          font-size: 11px;
          color: #718096;
        }

        .readyBadge {
          font-size: 10px;
          color: #5eead4;
          background: rgba(45, 212, 191, 0.08);
          padding: 6px 9px;
          border-radius: 999px;
        }

        .processButton {
          width: 100%;
          min-height: 55px;
          margin-top: 22px;
          border: none;
          border-radius: 15px;
          background: linear-gradient(
            90deg,
            #6366f1,
            #14b8a6
          );
          color: white;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          box-shadow: 0 14px 35px rgba(79, 70, 229, 0.22);
          transition: all 0.2s ease;
        }

        .processButton:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 18px 45px rgba(45, 212, 191, 0.24);
        }

        .processButton:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        .errorBox {
          margin-top: 17px;
          padding: 13px 15px;
          border-radius: 12px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.18);
          color: #fca5a5;
          display: flex;
          gap: 10px;
          font-size: 13px;
        }

        .conversation {
          max-width: 900px;
          margin: 70px auto 0;
          padding: 0 24px;
          position: relative;
          z-index: 2;
        }

        .conversationHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 30px;
        }

        .sectionLabel {
          color: #2dd4bf;
          font-size: 11px;
          letter-spacing: 2px;
          font-weight: 800;
        }

        .conversationHeader h2 {
          margin: 7px 0 0;
          font-size: 25px;
        }

        .clearButton {
          border: 1px solid rgba(148, 163, 184, 0.16);
          color: #94a3b8;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
          padding: 9px 14px;
          cursor: pointer;
        }

        .messageRow {
          display: flex;
          gap: 16px;
          margin-bottom: 28px;
        }

        .avatar {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 800;
        }

        .userAvatar {
          background: rgba(99, 102, 241, 0.15);
          color: #a5b4fc;
        }

        .aiAvatar {
          background: linear-gradient(
            135deg,
            rgba(45, 212, 191, 0.2),
            rgba(99, 102, 241, 0.2)
          );
          color: #5eead4;
        }

        .messageContent {
          flex: 1;
        }

        .messageTitle {
          color: #8291a6;
          font-size: 12px;
          margin-bottom: 8px;
        }

        .messageBubble {
          padding: 19px 20px;
          border-radius: 18px;
          font-size: 18px;
          line-height: 1.8;
        }

        .userBubble {
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.16);
        }

        .aiBubble {
          background: rgba(45, 212, 191, 0.06);
          border: 1px solid rgba(45, 212, 191, 0.13);
        }

        .features {
          max-width: 1000px;
          margin: 100px auto 0;
          padding: 0 24px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          position: relative;
          z-index: 2;
        }

        .featureCard {
          padding: 26px;
          border-radius: 20px;
          background: rgba(15, 27, 44, 0.42);
          border: 1px solid rgba(148, 163, 184, 0.1);
        }

        .featureIcon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          background: rgba(99, 102, 241, 0.09);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 23px;
          margin-bottom: 17px;
        }

        .featureCard h3 {
          margin: 0;
          font-size: 16px;
        }

        .featureCard p {
          margin: 9px 0 0;
          color: #77889e;
          line-height: 1.6;
          font-size: 13px;
        }

        footer {
          margin-top: 110px;
          border-top: 1px solid rgba(148, 163, 184, 0.08);
          text-align: center;
          padding: 45px 20px 50px;
          color: #64748b;
          position: relative;
          z-index: 2;
        }

        .footerLogo {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          color: white;
          font-weight: 800;
          margin-bottom: 14px;
        }

        .smallLogo {
          width: 30px;
          height: 30px;
          border-radius: 9px;
          background: linear-gradient(
            135deg,
            #6366f1,
            #14b8a6
          );
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
        }

        footer p {
          font-size: 13px;
        }

        footer strong {
          color: #cbd5e1;
        }

        .footerSmall {
          font-size: 11px;
          margin-top: 7px;
          color: #475569;
        }

        @keyframes wave {
          0%,
          100% {
            transform: scaleY(0.45);
          }

          50% {
            transform: scaleY(1);
          }
        }

        @keyframes pulseRing {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.25);
          }

          70% {
            box-shadow: 0 0 0 25px rgba(239, 68, 68, 0);
          }

          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 700px) {
          .navbar {
            padding: 20px;
          }

          .developer {
            display: none;
          }

          .hero {
            margin-top: 40px;
          }

          .hero h1 {
            letter-spacing: -1px;
          }

          .heroText {
            font-size: 15px;
          }

          .assistantCard {
            margin: 0 14px;
            padding: 22px;
            border-radius: 22px;
          }

          .cardHeader h2 {
            font-size: 17px;
          }

          .onlineStatus {
            font-size: 10px;
          }

          .features {
            grid-template-columns: 1fr;
            margin-top: 70px;
          }

          .conversation {
            margin-top: 55px;
            padding: 0 15px;
          }

          .messageRow {
            gap: 10px;
          }

          .avatar {
            width: 36px;
            height: 36px;
          }

          .messageBubble {
            font-size: 16px;
            padding: 16px;
          }
        }
      `}</style>
    </main>
  );
}