"use client";

import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { BrainIcon, ChevronDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { Streamdown } from "streamdown";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export function Reasoning({
  className,
  isStreaming = false,
  ...props
}: ComponentProps<typeof Collapsible> & { isStreaming?: boolean }) {
  return (
    <Collapsible
      className={cn("group/reasoning not-prose mb-4 w-full", className)}
      data-streaming={isStreaming || undefined}
      {...props}
    />
  );
}

export function ReasoningTrigger({ className, children, ...props }: ComponentProps<typeof CollapsibleTrigger>) {
  return (
    <CollapsibleTrigger
      className={cn("flex w-full items-center gap-2 text-sm text-muted-foreground hover:text-foreground", className)}
      {...props}
    >
      {children ?? (
        <>
          <BrainIcon className="size-4" />
          <span className="group-data-[streaming=true]/reasoning:animate-pulse">
            <span className="hidden group-data-[streaming=true]/reasoning:inline">Pensando...</span>
            <span className="group-data-[streaming=true]/reasoning:hidden">Razonamiento</span>
          </span>
          <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]/reasoning:rotate-180" />
        </>
      )}
    </CollapsibleTrigger>
  );
}

const plugins = { cjk, code, math, mermaid };

export function ReasoningContent({ className, children, ...props }: Omit<ComponentProps<typeof CollapsibleContent>, "children"> & { children: string }) {
  return (
    <CollapsibleContent className={cn("mt-4 text-sm text-muted-foreground", className)} {...props}>
      <Streamdown plugins={plugins}>{children}</Streamdown>
    </CollapsibleContent>
  );
}
