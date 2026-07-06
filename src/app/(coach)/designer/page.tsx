import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DesignerClient } from "./designer-client";

export const dynamic = "force-dynamic";

export default async function DesignerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return (
    <Suspense fallback={null}>
      <DesignerClient userId={session.user.id} />
    </Suspense>
  );
}
