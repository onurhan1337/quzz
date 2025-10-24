"use client";

import { useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  lightTheme?: string;
  darkTheme?: string;
}

export function CodeBlock({
  code,
  language = "typescript",
  className,
  lightTheme = "vesper",
  darkTheme = "github-dark",
}: CodeBlockProps) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    async function highlight() {
      const result = await codeToHtml(code, {
        lang: language,
        themes: {
          light: lightTheme,
          dark: darkTheme,
        },
      });
      setHtml(result);
    }

    highlight();
  }, [code, language, lightTheme, darkTheme]);

  if (!html) {
    return (
      <div className={cn("rounded-sm w-full border bg-muted p-4", className)}>
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted-foreground/20 rounded w-3/4"></div>
          <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
          <div className="h-4 bg-muted-foreground/20 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden border [&>pre]:!m-0 [&>pre]:!bg-transparent [&>pre]:p-4 [&>pre]:overflow-x-auto [&>pre]:text-xs",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
