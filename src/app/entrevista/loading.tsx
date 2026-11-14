import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="grid grid-cols-1 gap-4" aria-busy="true" aria-label="Carregando">
      <Skeleton className="h-2 w-full" />
      <Skeleton className="mx-auto h-16 w-16 rounded-full" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
