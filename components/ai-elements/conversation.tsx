"use client";

import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ScrollContext = createContext<{
  atBottom: boolean;
  scrollToBottom: () => void;
} | null>(null);

export function Conversation({ className, children, ...props }: ComponentProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);
  const scrollToBottom = () => ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new MutationObserver(() => {
      if (atBottom) element.scrollTop = element.scrollHeight;
    });
    observer.observe(element, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [atBottom]);

  return (
    <ScrollContext.Provider value={{ atBottom, scrollToBottom }}>
      <div
        className={cn("relative flex-1 overflow-y-auto", className)}
        onScroll={(event) => {
          const element = event.currentTarget;
          setAtBottom(element.scrollHeight - element.scrollTop - element.clientHeight < 24);
        }}
        ref={ref}
        role="log"
        {...props}
      >
        {children}
      </div>
    </ScrollContext.Provider>
  );
}

export function ConversationContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-8 p-4", className)} {...props} />;
}

export function ConversationScrollButton(props: ComponentProps<typeof Button>) {
  const scroll = useContext(ScrollContext);
  if (!scroll || scroll.atBottom) return null;

  return (
    <Button
      aria-label="Ir al último mensaje"
      className="sticky bottom-4 left-1/2 -translate-x-1/2 rounded-full"
      onClick={scroll.scrollToBottom}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <ArrowDownIcon />
    </Button>
  );
}
