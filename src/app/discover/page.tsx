
import { Localize } from "@/components/Localize";
import { DiscoverView } from "@/components/DiscoverView";
import { parseSearch } from "@/lib/search";

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const input = parseSearch(await searchParams);
  return <Localize><DiscoverView input={input} /></Localize>;
}
