import { Skeleton } from "@/components/ui/skeleton";

export default function HelpLoading() {
  return (
    <div className="container max-w-6xl mx-auto p-6 h-full overflow-y-auto">
      <Skeleton className="h-10 w-[200px] mb-8" />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="col-span-2">
          <Skeleton className="h-[400px] w-full" />
        </div>
        
        <div>
          <Skeleton className="h-[280px] w-full" />
        </div>
      </div>
      
      <Skeleton className="h-[200px] w-full" />
    </div>
  );
} 