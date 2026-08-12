"use client";

import type { ChatStatus, FileUIPart } from "ai";
import { ArrowUpIcon, LoaderCircleIcon, SquareIcon, XIcon } from "lucide-react";
import type {
  ComponentProps,
  FormEvent,
  FormEventHandler,
  KeyboardEventHandler,
} from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PromptInputMessage {
  text: string;
  files: FileUIPart[];
}

export type PromptInputProps = Omit<ComponentProps<"form">, "onSubmit"> & {
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
};

const filePart = (file: File): Promise<FileUIPart> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () =>
      resolve({
        filename: file.name,
        mediaType: file.type,
        type: "file",
        url: String(reader.result),
      });
    reader.readAsDataURL(file);
  });

export function PromptInput({ className, onSubmit, ...props }: PromptInputProps) {
  const [files, setFiles] = useState<File[]>([]);

  const submit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const text = String(new FormData(form).get("message") ?? "");

    try {
      await onSubmit({ text, files: await Promise.all(files.map(filePart)) }, event);
      form.reset();
      setFiles([]);
    } catch {
      // Keep the draft available for retry.
    }
  };

  return (
    <form
      className={cn(
        "relative w-full overflow-hidden rounded-xl border bg-card shadow-xs focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
        className,
      )}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        setFiles((current) => [...current, ...event.dataTransfer.files]);
      }}
      onPaste={(event) => {
        const pasted = [...event.clipboardData.items]
          .filter((item) => item.kind === "file")
          .flatMap((item) => item.getAsFile() ?? []);
        if (pasted.length > 0) {
          event.preventDefault();
          setFiles((current) => [...current, ...pasted]);
        }
      }}
      onSubmit={submit}
      {...props}
    />
  );
}

export function PromptInputTextarea({
  className,
  onKeyDown,
  onPaste,
  ...props
}: ComponentProps<"textarea">) {
  const keyDown: KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    onKeyDown?.(event);
    if (
      !event.defaultPrevented &&
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <textarea
      className={cn(
        "field-sizing-content max-h-48 min-h-18 w-full resize-none bg-transparent px-4 py-3 pr-14 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      name="message"
      onKeyDown={keyDown}
      onPaste={onPaste}
      {...props}
    />
  );
}

export type PromptInputSubmitProps = ComponentProps<typeof Button> & {
  status?: ChatStatus;
  onStop?: () => void;
};

export function PromptInputSubmit({
  children,
  className,
  onClick,
  onStop,
  status,
  ...props
}: PromptInputSubmitProps) {
  const generating = status === "submitted" || status === "streaming";
  const Icon =
    status === "submitted"
      ? LoaderCircleIcon
      : status === "streaming"
        ? SquareIcon
        : status === "error"
          ? XIcon
          : ArrowUpIcon;

  return (
    <Button
      aria-label={generating ? "Detener" : "Enviar"}
      className={cn("absolute right-2.5 bottom-2.5 rounded-full", className)}
      onClick={(event) => {
        if (generating && onStop) {
          event.preventDefault();
          onStop();
        } else {
          onClick?.(event);
        }
      }}
      size="icon-sm"
      type={generating && onStop ? "button" : "submit"}
      {...props}
    >
      {children ?? <Icon className={cn("size-4", status === "submitted" && "animate-spin")} />}
    </Button>
  );
}
