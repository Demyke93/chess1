
import { cn } from "@/lib/utils";

interface ContainerProps {
  className?: string;
  children: React.ReactNode;
}

export function Container({ className, children }: ContainerProps) {
  return (
    <div className={cn("w-full px-4 mx-auto max-w-7xl sm:px-6 lg:px-8", className)}>
      {children}
    </div>
  );
}
