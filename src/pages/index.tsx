// src/pages/index.tsx
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! Ask me anything. 😊" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // auto-scroll to the latest message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const prompt = input.trim();
    if (!prompt || loading) return;

    // push the user message to UI
    const nextUI = [...messages, { role: "user", content: prompt } as Msg];
    setMessages(nextUI);
    setInput("");
    setLoading(true);

    try {
      // map UI roles to server roles expected by Gemini API:
      // assistant -> model, user -> user. (No system message from UI)
      const serverMessages = nextUI.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: serverMessages }),
      });

      const raw = await res.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        data = { error: raw };
      }

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : `HTTP ${res.status}`
        );
      }

      const answer: string = data?.text ?? "(no response)";
      setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err?.message || "Something went wrong."}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col p-4">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">NALA test chat</h1>
        <p className="text-sm text-gray-500">
          Press <kbd className="rounded border px-1">Enter</kbd> to send,{" "}
          <kbd className="rounded border px-1">Shift</kbd>+
          <kbd className="rounded border px-1">Enter</kbd> for newline
        </p>
      </header>

      <section className="flex-1 space-y-3 rounded-2xl border p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={[
                "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 shadow-sm",
                m.role === "user" ? "bg-black text-white" : "bg-gray-100",
              ].join(" ")}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-gray-100 px-4 py-3 shadow-sm">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </section>

      <form onSubmit={sendMessage} className="mt-4 flex items-end gap-3">
        <textarea
          className="w-full flex-1 resize-none rounded-2xl border p-3 shadow-sm focus:outline-none"
          rows={3}
          placeholder="Type your message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-2xl bg-black px-5 py-3 text-white shadow-sm disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </main>
  );
}
