"use client";

import { Button } from "@/components/ui";
import Link from "next/link";
import { motion } from "framer-motion";
import { GithubIcon } from "lucide-react";
import Image from "next/image";

export function Hero() {
  return (
    <section className="relative py-24 sm:py-[90px] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-[900px] mx-auto px-4 relative">
        <div className="max-w-[680px] mx-auto text-center">
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-32 h-32 rounded-2xl flex items-center justify-center">
              <Image
                src="/logo.svg"
                alt="quzz logo"
                width={32}
                height={32}
                className="w-full h-full"
              />
            </div>
          </motion.div>
          <motion.h1
            className="text-3xl md:text-4xl font-semibold tracking-tight mb-6 bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Minimal DX tool for debugging React Server Components
          </motion.h1>
          <motion.p
            className="text-base text-muted-foreground mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Production-grade debugging and performance monitoring for Next.js
            App Router. Wrap your components to get instant visibility into
            render times, props, and execution flow.
          </motion.p>
          <motion.div
            className="flex flex-wrap gap-3 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href="#get-started">
              <Button size="lg" className="rounded-none">
                Get Started
              </Button>
            </Link>
            <Link
              href="https://github.com/onurhan1337/quzz"
              target="_blank"
              rel="noopener"
            >
              <Button variant="outline" size="lg" className="rounded-none">
                <GithubIcon className="w-4 h-4 mr-2" /> GitHub
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
