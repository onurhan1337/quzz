import { Button } from "@/components/ui"
import Link from "next/link"

export function Hero() {
  return (
    <section className="py-24 sm:py-[90px]">
      <div className="max-w-[1080px] mx-auto px-4">
        <div className="max-w-[780px] mx-auto text-center">
          <h1 className="text-5xl font-bold tracking-tight mb-6">
            Minimal DX tool for debugging React Server Components
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Production-grade debugging and performance monitoring for Next.js App Router.
            Wrap your components to get instant visibility into render times, props, and execution flow.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link href="#get-started">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="https://github.com/yourusername/quzz" target="_blank" rel="noopener">
              <Button variant="outline" size="lg">Star on GitHub</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
