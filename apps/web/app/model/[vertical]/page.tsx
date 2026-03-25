// apps/web/app/model/[vertical]/page.tsx
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessVertical, getUser } from "@/lib/auth";

interface PageProps {
  params: Promise<{ vertical: string }>;
}

export default async function VerticalModelPage({ params }: PageProps) {
  const { vertical } = await params;
  const supabase = await createClient();

  const { data: verticalData } = await supabase
    .from("verticals")
    .select("id, slug, display_name, is_active")
    .eq("slug", vertical)
    .eq("is_active", true)
    .maybeSingle();

  if (!verticalData) notFound();

  const accessible = await canAccessVertical(verticalData.id);

  if (!accessible) {
    const user = await getUser();
    redirect(user ? "/pricing" : `/signup?next=/model/${vertical}`);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {verticalData.display_name} Cost Model
      </h1>
      {/* TODO: <CalculatorClient verticalId={verticalData.id} /> */}
      <p className="text-gray-500 text-sm">Calculator component goes here.</p>
    </main>
  );
}
