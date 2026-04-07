"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  FileQuestion,
  BookOpen,
  CheckCircle2,
  Eye,
  Save,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { PLAY_LIBRARY } from "@/engine/plays-library";

// ── Types ──────────────────────────────────────────────────────────

type KnowledgeCategory =
  | "formations"
  | "rules"
  | "sportsmanship"
  | "nutrition"
  | "run_game"
  | "passing_game"
  | "teamwork";

interface QuizQuestion {
  id: string;
  source: "play" | "custom";
  questionText: string;
  options: string[];
  correctIndex: number;
  category?: KnowledgeCategory;
  playId?: string;
}

const KNOWLEDGE_CATEGORIES: { value: KnowledgeCategory; label: string }[] = [
  { value: "formations", label: "Formations" },
  { value: "rules", label: "Rules" },
  { value: "sportsmanship", label: "Sportsmanship" },
  { value: "nutrition", label: "Nutrition" },
  { value: "run_game", label: "Run Game" },
  { value: "passing_game", label: "Passing Game" },
  { value: "teamwork", label: "Teamwork" },
];

const PLAY_QUESTION_TEMPLATES = [
  { label: "What formation is used?", template: (playName: string) => `What formation is used in "${playName}"?` },
  { label: "What route does X run?", template: (playName: string) => `In "${playName}", what route does the X receiver run?` },
  { label: "What is the primary read?", template: (playName: string) => `What is the primary read in "${playName}"?` },
  { label: "What type of play is this?", template: (playName: string) => `What type of play is "${playName}"?` },
];

let nextId = 1;
function generateId() {
  return `q-${Date.now()}-${nextId++}`;
}

// ── Component ──────────────────────────────────────────────────────

export default function QuizCreatePage() {
  const [quizName, setQuizName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // -- Add custom question --
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customText, setCustomText] = useState("");
  const [customOptions, setCustomOptions] = useState(["", "", "", ""]);
  const [customCorrect, setCustomCorrect] = useState(0);
  const [customCategory, setCustomCategory] = useState<KnowledgeCategory>("formations");

  // -- Add play question --
  const [showPlayForm, setShowPlayForm] = useState(false);
  const [selectedPlayId, setSelectedPlayId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [playOptions, setPlayOptions] = useState(["", "", "", ""]);
  const [playCorrect, setPlayCorrect] = useState(0);

  const addCustomQuestion = useCallback(() => {
    if (!customText.trim() || customOptions.some((o) => !o.trim())) return;
    setQuestions((prev) => [
      ...prev,
      {
        id: generateId(),
        source: "custom",
        questionText: customText,
        options: [...customOptions],
        correctIndex: customCorrect,
        category: customCategory,
      },
    ]);
    setCustomText("");
    setCustomOptions(["", "", "", ""]);
    setCustomCorrect(0);
    setShowCustomForm(false);
  }, [customText, customOptions, customCorrect, customCategory]);

  const addPlayQuestion = useCallback(() => {
    const play = PLAY_LIBRARY.find((p) => p.id === selectedPlayId);
    if (!play || playOptions.some((o) => !o.trim())) return;
    const template = PLAY_QUESTION_TEMPLATES[selectedTemplate];
    setQuestions((prev) => [
      ...prev,
      {
        id: generateId(),
        source: "play",
        questionText: template.template(play.name),
        options: [...playOptions],
        correctIndex: playCorrect,
        playId: play.id,
      },
    ]);
    setPlayOptions(["", "", "", ""]);
    setPlayCorrect(0);
    setShowPlayForm(false);
  }, [selectedPlayId, selectedTemplate, playOptions, playCorrect]);

  const removeQuestion = useCallback((id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const moveQuestion = useCallback((index: number, direction: "up" | "down") => {
    setQuestions((prev) => {
      const next = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!quizName.trim() || questions.length === 0) return;
    setSaving(true);
    // In the future this will call createQuiz + addQuizQuestion server actions.
    // For now, log and simulate save.
    console.log("Saving quiz:", {
      name: quizName,
      dueDate: dueDate || undefined,
      questions: questions.map((q, i) => ({
        sortOrder: i,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.options[q.correctIndex],
        category: q.category,
        playId: q.playId,
      })),
    });
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSaving(false);
  }, [quizName, dueDate, questions]);

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/quizzes"
          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Quiz</h1>
          <p className="text-sm text-zinc-500">
            Build a quiz to test your players&apos; football knowledge.
          </p>
        </div>
      </div>

      {/* Quiz Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Quiz Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Quiz Name
            </label>
            <Input
              value={quizName}
              onChange={(e) => setQuizName(e.target.value)}
              placeholder="e.g. Week 3 Film Review"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-400">
              Due Date (optional)
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Questions */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">
          Questions ({questions.length})
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowPlayForm(true);
              setShowCustomForm(false);
            }}
          >
            <BookOpen className="mr-1.5 h-3.5 w-3.5" />
            From Play
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowCustomForm(true);
              setShowPlayForm(false);
            }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Custom
          </Button>
        </div>
      </div>

      {/* Question list */}
      {questions.length === 0 && !showCustomForm && !showPlayForm && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800 py-16">
          <FileQuestion className="mb-3 h-10 w-10 text-zinc-700" />
          <p className="text-sm text-zinc-500">No questions yet</p>
          <p className="mt-1 text-xs text-zinc-600">
            Add questions from plays or create custom knowledge questions.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {questions.map((q, i) => (
          <Card key={q.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Drag handle + order controls */}
                <div className="flex flex-col items-center gap-0.5 pt-0.5">
                  <GripVertical className="h-4 w-4 text-zinc-600" />
                  <button
                    onClick={() => moveQuestion(i, "up")}
                    disabled={i === 0}
                    className="rounded p-0.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => moveQuestion(i, "down")}
                    disabled={i === questions.length - 1}
                    className="rounded p-0.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300 disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Question content */}
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-500">
                      Q{i + 1}
                    </span>
                    <Badge
                      variant={q.source === "play" ? "default" : "outline"}
                      className="text-[10px]"
                    >
                      {q.source === "play" ? "Play" : q.category ?? "Custom"}
                    </Badge>
                  </div>
                  <p className="mb-2 text-sm text-zinc-200">{q.questionText}</p>

                  {/* Preview toggle */}
                  {previewIndex === i ? (
                    <div className="space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs",
                            oi === q.correctIndex
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-zinc-800/50 text-zinc-400",
                          )}
                        >
                          {oi === q.correctIndex && (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          )}
                          <span className="mr-2 font-medium text-zinc-500">
                            {String.fromCharCode(65 + oi)}.
                          </span>
                          {opt}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() =>
                      setPreviewIndex(previewIndex === i ? null : i)
                    }
                    className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Play Question Form ── */}
      {showPlayForm && (
        <Card className="mt-4 border-indigo-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add Question from Play</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Play selector */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Select Play
              </label>
              <select
                value={selectedPlayId}
                onChange={(e) => setSelectedPlayId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <option value="">Choose a play...</option>
                {PLAY_LIBRARY.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.formation})
                  </option>
                ))}
              </select>
            </div>

            {/* Question template */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Question Template
              </label>
              <div className="flex flex-wrap gap-2">
                {PLAY_QUESTION_TEMPLATES.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTemplate(i)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      selectedTemplate === i
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "bg-zinc-800 text-zinc-500 hover:text-zinc-300",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Answer options */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Answer Options (mark correct)
              </label>
              <div className="space-y-2">
                {playOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      onClick={() => setPlayCorrect(i)}
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors",
                        playCorrect === i
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                          : "border-zinc-700 text-zinc-500 hover:border-zinc-500",
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </button>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const next = [...playOptions];
                        next[i] = e.target.value;
                        setPlayOptions(next);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="h-9 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPlayForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={addPlayQuestion}
                disabled={!selectedPlayId || playOptions.some((o) => !o.trim())}
              >
                Add Question
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Custom Question Form ── */}
      {showCustomForm && (
        <Card className="mt-4 border-indigo-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Add Custom Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {KNOWLEDGE_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setCustomCategory(cat.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      customCategory === cat.value
                        ? "bg-indigo-500/20 text-indigo-300"
                        : "bg-zinc-800 text-zinc-500 hover:text-zinc-300",
                    )}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Question text */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Question
              </label>
              <Input
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="e.g. What does good sportsmanship look like after a loss?"
              />
            </div>

            {/* Answer options */}
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-400">
                Answer Options (mark correct)
              </label>
              <div className="space-y-2">
                {customOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button
                      onClick={() => setCustomCorrect(i)}
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold transition-colors",
                        customCorrect === i
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                          : "border-zinc-700 text-zinc-500 hover:border-zinc-500",
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </button>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const next = [...customOptions];
                        next[i] = e.target.value;
                        setCustomOptions(next);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="h-9 text-xs"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCustomForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={addCustomQuestion}
                disabled={
                  !customText.trim() || customOptions.some((o) => !o.trim())
                }
              >
                Add Question
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save bar */}
      {questions.length > 0 && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/80 p-4">
          <p className="text-xs text-zinc-500">
            {questions.length} question{questions.length !== 1 ? "s" : ""} ready
          </p>
          <Button
            onClick={handleSave}
            disabled={saving || !quizName.trim()}
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Quiz"}
          </Button>
        </div>
      )}
    </div>
  );
}
