import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Total Plays", value: "\u2014", color: "text-white" },
  { label: "This Week's Install", value: "\u2014", color: "text-green-400" },
  { label: "Player Completion", value: "\u2014", color: "text-amber-400" },
  { label: "Avg Quiz Score", value: "\u2014", color: "text-indigo-400" },
];

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Welcome to PlayForge. Create a playbook to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-zinc-500">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-zinc-400">
          <p>1. Create your first playbook</p>
          <p>2. Add plays using the Play Designer</p>
          <p>3. Invite your players with an invite code</p>
          <p>4. Build a game plan and assign quizzes</p>
        </CardContent>
      </Card>
    </div>
  );
}
