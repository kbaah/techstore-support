"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  Send,
  Trash2,
  User,
  Bot,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Loader2,
  Mic,
  MicOff,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  conversationId?: string;
  feedback?: "up" | "down" | null;
}

interface CustomerState {
  verified?: boolean;
  name?: string;
  customer_id?: string;
}

// Type declaration for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [customerState, setCustomerState] = useState<CustomerState>({});
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for speech recognition support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      setSpeechSupported(!!SpeechRecognition);
    }
  }, []);

  const startListening = () => {
    if (!speechSupported) return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = event.results;
      let transcript = "";

      for (let i = event.resultIndex; i < results.length; i++) {
        transcript += results[i][0].transcript;
      }

      setInput(transcript);

      // If this is a final result, we can optionally auto-submit
      if (results[results.length - 1].isFinal) {
        // Keep the transcript in input, user can edit or press send
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
          customerState,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            conversationId: data.conversationId,
            feedback: null,
          },
        ]);
        if (data.customerState) {
          setCustomerState(data.customerState);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (
    messageIndex: number,
    thumbsUp: boolean
  ) => {
    const message = messages[messageIndex];
    if (!message.conversationId || message.feedback) return;

    setFeedbackLoading(message.conversationId);

    try {
      // Submit user feedback
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: message.conversationId,
          thumbsUp,
        }),
      });

      // Run LLM evaluation in background
      fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: message.conversationId,
        }),
      });

      // Update message feedback state
      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === messageIndex
            ? { ...msg, feedback: thumbsUp ? "up" : "down" }
            : msg
        )
      );
    } catch (error) {
      console.error("Feedback error:", error);
    } finally {
      setFeedbackLoading(null);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCustomerState({});
  };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              TechStore Support
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              How can we help you today?
            </p>
          </div>
          <div className="flex items-center gap-3">
            {customerState.verified && (
              <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <ShieldCheck size={16} />
                <span>{customerState.name}</span>
              </div>
            )}
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              <BarChart3 size={16} />
              <span>Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-hidden">
        <div className="mx-auto h-full max-w-3xl">
          <div className="flex h-full flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-6 rounded-full bg-blue-100 p-4 dark:bg-blue-900/30">
                    <Bot
                      size={32}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  </div>
                  <h2 className="mb-2 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    Welcome to TechStore Support
                  </h2>
                  <p className="mb-6 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                    I can help you browse products, check prices and stock, view
                    your orders, and place new orders.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "Show me gaming laptops",
                      "Search for 4K monitors",
                      "I want to check my orders",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {message.role === "assistant" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                          <Bot
                            size={18}
                            className="text-blue-600 dark:text-blue-400"
                          />
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            message.role === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                          }`}
                        >
                          {message.role === "user" ? (
                            <p className="whitespace-pre-wrap text-sm">
                              {message.content}
                            </p>
                          ) : (
                            <div className="prose prose-sm prose-zinc dark:prose-invert max-w-none">
                              <ReactMarkdown
                                components={{
                                  // Style tables nicely
                                  table: ({ children }) => (
                                    <div className="overflow-x-auto my-2">
                                      <table className="min-w-full text-sm border-collapse">
                                        {children}
                                      </table>
                                    </div>
                                  ),
                                  thead: ({ children }) => (
                                    <thead className="bg-zinc-100 dark:bg-zinc-700">
                                      {children}
                                    </thead>
                                  ),
                                  th: ({ children }) => (
                                    <th className="px-3 py-2 text-left font-medium border-b border-zinc-200 dark:border-zinc-600">
                                      {children}
                                    </th>
                                  ),
                                  td: ({ children }) => (
                                    <td className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-700">
                                      {children}
                                    </td>
                                  ),
                                  // Style lists
                                  ul: ({ children }) => (
                                    <ul className="list-disc pl-4 my-2 space-y-1">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="list-decimal pl-4 my-2 space-y-1">
                                      {children}
                                    </ol>
                                  ),
                                  li: ({ children }) => (
                                    <li className="text-sm">{children}</li>
                                  ),
                                  // Style headings
                                  h1: ({ children }) => (
                                    <h1 className="text-lg font-bold mt-3 mb-2">
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-base font-bold mt-3 mb-2">
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="text-sm font-bold mt-2 mb-1">
                                      {children}
                                    </h3>
                                  ),
                                  // Style code
                                  code: ({ children }) => (
                                    <code className="bg-zinc-100 dark:bg-zinc-700 px-1 py-0.5 rounded text-xs font-mono">
                                      {children}
                                    </code>
                                  ),
                                  // Style bold/strong for product names, prices
                                  strong: ({ children }) => (
                                    <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                                      {children}
                                    </strong>
                                  ),
                                  // Style paragraphs
                                  p: ({ children }) => (
                                    <p className="text-sm my-1.5">{children}</p>
                                  ),
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                        {/* Feedback buttons for assistant messages */}
                        {message.role === "assistant" &&
                          message.conversationId && (
                            <div className="flex items-center gap-1">
                              {feedbackLoading === message.conversationId ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin text-zinc-400"
                                />
                              ) : message.feedback ? (
                                <span className="text-xs text-zinc-500">
                                  {message.feedback === "up"
                                    ? "Thanks for your feedback!"
                                    : "Thanks, we'll improve!"}
                                </span>
                              ) : (
                                <>
                                  <span className="mr-1 text-xs text-zinc-400">
                                    Was this helpful?
                                  </span>
                                  <button
                                    onClick={() => handleFeedback(index, true)}
                                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30"
                                    title="Yes, helpful"
                                  >
                                    <ThumbsUp size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleFeedback(index, false)}
                                    className="rounded p-1 text-zinc-400 transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                                    title="Not helpful"
                                  >
                                    <ThumbsDown size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                      </div>
                      {message.role === "user" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600">
                          <User size={18} className="text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Bot
                          size={18}
                          className="text-blue-600 dark:text-blue-400"
                        />
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm dark:bg-zinc-800">
                        <div className="flex gap-1">
                          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]"></span>
                          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]"></span>
                          <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      isListening
                        ? "Listening..."
                        : "Ask me anything about our products..."
                    }
                    className={`w-full rounded-full border bg-zinc-50 px-4 py-3 pr-12 text-sm text-zinc-900 placeholder-zinc-500 outline-none transition-colors focus:border-blue-500 focus:bg-white dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-400 dark:focus:border-blue-500 dark:focus:bg-zinc-800 ${
                      isListening
                        ? "border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-900/20"
                        : "border-zinc-200 dark:border-zinc-700"
                    }`}
                    disabled={isLoading}
                  />
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      disabled={isLoading}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                        isListening
                          ? "bg-red-500 text-white animate-pulse"
                          : "text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                      }`}
                      title={isListening ? "Stop listening" : "Start voice input"}
                    >
                      {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600"
                >
                  <Send size={20} />
                </button>
                <button
                  type="button"
                  onClick={clearChat}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  <Trash2 size={20} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
