import { Separator } from "@/components/ui"
import Link from "next/link"

export function Footer() {
  return (
    <>
      <Separator />
      <footer className="py-12">
        <div className="max-w-[1080px] mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Built for Next.js and React Server Components
            </p>
            <Link
              href="https://github.com/yourusername/quzz"
              target="_blank"
              rel="noopener"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </Link>
          </div>
        </div>
      </footer>
    </>
  )
}
