import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="container max-w-6xl mx-auto p-6 h-full overflow-y-auto">
      <Skeleton className="h-10 w-[200px] mb-8" />
      
      <div className="w-full max-w-4xl">
        <Skeleton className="h-10 w-[300px] mb-6" />
        
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-[150px] mb-4" />
            <Skeleton className="h-28 w-full" />
          </div>
          
          <div>
            <Skeleton className="h-8 w-[150px] mb-4" />
            <Skeleton className="h-28 w-full" />
          </div>
          
          <div>
            <Skeleton className="h-8 w-[150px] mb-4" />
            <Skeleton className="h-28 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
} 