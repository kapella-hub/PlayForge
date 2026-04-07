import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  subtitle?: string;
  icon?: LucideIcon;
}

export function StatCard({
  label,
  value,
  color = "text-white",
  subtitle,
  icon: Icon,
}: StatCardProps) {
  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/5">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500">{label}</p>
          {Icon && <Icon className="h-4 w-4 text-zinc-600" />}
        </div>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        {subtitle && (
          <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
