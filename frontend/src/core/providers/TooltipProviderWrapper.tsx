import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { ReactNode } from "react";

interface TooltipProviderWrapperProps {
  children: ReactNode;
}

export const TooltipProviderWrapper = ({ children }: TooltipProviderWrapperProps) => {
  return <TooltipProvider>{children}</TooltipProvider>;
};
