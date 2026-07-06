import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuizCardProps {
  id: string;
  name: string;
  questionCount: number;
  dueDate?: Date | string | null;
  gamePlanName?: string | null;
  href: string;
}

export function QuizCard({
  id,
  name,
  questionCount,
  dueDate,
  gamePlanName,
  href,
}: QuizCardProps) {
  const due = dueDate ? new Date(dueDate) : null;
  const isOverdue = due && due < new Date();

  return (
    <Link href={href}>
      <Card>
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/30">
            <FileQuestion className="h-5 w-5 text-primary-emphasis" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {name}
            </h3>

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {questionCount} {questionCount === 1 ? "question" : "questions"}
              </span>

              {gamePlanName && (
                <Badge variant="outline" className="text-[10px]">
                  {gamePlanName}
                </Badge>
              )}

              {due && (
                <Badge
                  variant="outline"
                  className={
                    isOverdue
                      ? "border-destructive text-[10px] text-destructive"
                      : "text-[10px]"
                  }
                >
                  {isOverdue ? "Overdue" : `Due ${due.toLocaleDateString()}`}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
