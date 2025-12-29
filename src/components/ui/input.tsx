import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onTouchStart, ...props }, ref) => {
    // iOS Safari fix: force focus on touch
    const handleTouchStart = (e: React.TouchEvent<HTMLInputElement>) => {
      // Call any existing handler
      onTouchStart?.(e);
      // Force focus after a tiny delay to help iOS
      const input = e.currentTarget;
      setTimeout(() => {
        input.focus();
      }, 10);
    };

    return (
      <input
        type={type}
        // iOS Safari: ensure keyboard appears properly
        autoComplete={props.autoComplete ?? "off"}
        autoCapitalize={props.autoCapitalize ?? (type === "email" ? "none" : undefined)}
        autoCorrect={props.autoCorrect ?? "off"}
        spellCheck={props.spellCheck ?? false}
        onTouchStart={handleTouchStart}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-base ring-offset-background transition-colors duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };