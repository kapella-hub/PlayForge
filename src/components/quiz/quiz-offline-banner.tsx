export function QuizOfflineBanner() {
  return (
    <div
      role="status"
      className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning"
    >
      Quizzes need a connection — your plays are still available.
    </div>
  );
}
