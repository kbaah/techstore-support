"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Bot,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface Evaluation {
  conversation_id: string;
  user_query: string;
  agent_response: string;
  timestamp: string;
  user_feedback?: {
    thumbs_up: boolean;
    comment?: string;
    submitted_at: string;
  };
  llm_evaluation?: {
    helpfulness: { score: number; reason: string };
    accuracy: { score: number; reason: string };
    tone: { score: number; reason: string };
    completeness: { score: number; reason: string };
    safety: { score: number; reason: string };
    overall_score: number;
    summary: string;
    evaluated_at: string;
  };
}

interface Summary {
  total_conversations: number;
  with_user_feedback: number;
  with_llm_evaluation: number;
  thumbs_up: number;
  thumbs_down: number;
  average_llm_score: number;
  category_averages: {
    helpfulness: number;
    accuracy: number;
    tone: number;
    completeness: number;
    safety: number;
  };
}

interface DashboardData {
  evaluations: Evaluation[];
  summary: Summary;
}

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const percentage = (score / max) * 100;
  const color =
    score >= 4
      ? "bg-green-500"
      : score >= 3
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className={`h-full ${color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm font-medium">{score.toFixed(1)}</span>
    </div>
  );
}

function EvaluationCard({ evaluation }: { evaluation: Evaluation }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <MessageSquare size={16} className="text-zinc-400" />
            <span className="text-xs text-zinc-500">
              {new Date(evaluation.timestamp).toLocaleString()}
            </span>
            {evaluation.user_feedback && (
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                  evaluation.user_feedback.thumbs_up
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}
              >
                {evaluation.user_feedback.thumbs_up ? (
                  <ThumbsUp size={12} />
                ) : (
                  <ThumbsDown size={12} />
                )}
                User
              </span>
            )}
            {evaluation.llm_evaluation && (
              <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <Bot size={12} />
                {evaluation.llm_evaluation.overall_score.toFixed(1)}/5
              </span>
            )}
          </div>

          <p className="mb-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Q: {evaluation.user_query.slice(0, 100)}
            {evaluation.user_query.length > 100 && "..."}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            A: {evaluation.agent_response.slice(0, 150)}
            {evaluation.agent_response.length > 150 && "..."}
          </p>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
        >
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <div className="mb-4">
            <h4 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Full Conversation
            </h4>
            <div className="rounded bg-zinc-50 p-3 dark:bg-zinc-900">
              <p className="mb-2 text-sm">
                <span className="font-medium">User:</span>{" "}
                {evaluation.user_query}
              </p>
              <p className="text-sm">
                <span className="font-medium">Agent:</span>{" "}
                {evaluation.agent_response}
              </p>
            </div>
          </div>

          {evaluation.llm_evaluation && (
            <div>
              <h4 className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                LLM Evaluation
              </h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    "helpfulness",
                    "accuracy",
                    "tone",
                    "completeness",
                    "safety",
                  ] as const
                ).map((category) => (
                  <div
                    key={category}
                    className="flex items-center justify-between rounded bg-zinc-50 p-2 dark:bg-zinc-900"
                  >
                    <span className="text-sm capitalize">{category}</span>
                    <ScoreBar
                      score={evaluation.llm_evaluation![category].score}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {evaluation.llm_evaluation.summary}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/evaluations");
      if (!response.ok) throw new Error("Failed to fetch evaluations");
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              <ArrowLeft size={20} />
              Back to Chat
            </Link>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Evaluation Dashboard
            </h1>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={24} className="animate-spin text-zinc-400" />
          </div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Total Conversations
                </div>
                <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {data.summary.total_conversations}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  User Feedback
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-green-600">
                    <ThumbsUp size={18} />
                    <span className="text-xl font-semibold">
                      {data.summary.thumbs_up}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-red-600">
                    <ThumbsDown size={18} />
                    <span className="text-xl font-semibold">
                      {data.summary.thumbs_down}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  LLM Evaluations
                </div>
                <div className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {data.summary.with_llm_evaluation}
                </div>
              </div>

              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Average LLM Score
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {data.summary.average_llm_score.toFixed(1)}
                  </span>
                  <span className="text-zinc-400">/ 5</span>
                </div>
              </div>
            </div>

            {/* Category Scores */}
            {data.summary.with_llm_evaluation > 0 && (
              <div className="mb-8 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
                <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  Average Scores by Category
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  {Object.entries(data.summary.category_averages).map(
                    ([category, score]) => (
                      <div key={category} className="text-center">
                        <div className="mb-2 text-sm capitalize text-zinc-600 dark:text-zinc-400">
                          {category}
                        </div>
                        <div className="mx-auto flex justify-center">
                          <ScoreBar score={score} />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Evaluations List */}
            <div>
              <h2 className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Recent Evaluations
              </h2>
              {data.evaluations.length === 0 ? (
                <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-800">
                  <MessageSquare
                    size={32}
                    className="mx-auto mb-2 text-zinc-300 dark:text-zinc-600"
                  />
                  <p className="text-zinc-500 dark:text-zinc-400">
                    No evaluations yet. Start chatting and provide feedback!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.evaluations
                    .sort(
                      (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime()
                    )
                    .map((evaluation) => (
                      <EvaluationCard
                        key={evaluation.conversation_id}
                        evaluation={evaluation}
                      />
                    ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
