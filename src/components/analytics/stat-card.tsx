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
  color = "text-foreground",
  subtitle,
  icon: Icon,
}: StatCardProps) {
  return (
    <Card className="overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
      <CardContent className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        </div>
        <p className={`text-3xl font-semibold sm:text-4xl ${color}`}>{value}</p>
        {subtitle && (
          <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
