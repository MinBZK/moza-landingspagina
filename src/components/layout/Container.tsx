import type { PropsWithChildren } from "react";

interface ContainerProps {
  className?: string;
}

export function Container({
  children,
  className = "",
}: PropsWithChildren<ContainerProps>) {
  return (
    <div
      className={`container mx-auto h-auto max-w-[1200px] ${className}`.trim()}
    >
      {children}
    </div>
  );
}
