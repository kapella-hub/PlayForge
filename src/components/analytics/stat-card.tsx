import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  subtitle?: string;
}

export function StatCard({
  label,
  value,
  color = "text-white",
  subtitle,
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-xs text-zinc-500">{label}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        {subtitle && (
          <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
