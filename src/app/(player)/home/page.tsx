import { Card, CardContent } from "@/components/ui/card";

export default function PlayerHomePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Welcome back 👋</h1>
        <p className="text-sm text-zinc-500">Your study feed is empty. Check back when your coach assigns plays.</p>
      </div>

      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="py-4">
          <div className="text-[11px] font-semibold text-amber-400">NO PLAYS ASSIGNED</div>
          <div className="mt-1 text-sm font-medium text-white">
            Ask your coach for an invite code to join a team.
          </div>
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-white">This Week</div>
            <div className="text-sm font-semibold text-zinc-500">0/0</div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
            <div className="h-1.5 rounded-full bg-green-500" style={{ width: "0%" }} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
