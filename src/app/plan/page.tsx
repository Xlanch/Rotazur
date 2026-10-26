
import { Localize } from "@/components/Localize";
import { PlanView } from "@/components/PlanView";
import { parseSearch } from "@/lib/search";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const input = parseSearch(await searchParams);
  return <Localize><PlanView input={input} /></Localize>;
}
