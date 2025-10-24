import { Hero, FeatureExample, Footer } from "@/components/sections"
import { Separator } from "@/components/ui"
import { InteractiveDemo } from "@/components/interactive-demo"
import { ConfigDemo } from "@/components/config-demo"
import { Zap, AlertCircle, Network, Shield, Code2, Settings } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />

      <Separator />

      <FeatureExample
        title="Wrap and trace any Server Component"
        description="Get instant visibility into your React Server Components with a simple HOC wrapper. Track performance, props, and execution flow without changing your component logic."
        codeExample={`import { withRSCTrace } from 'quzz'

export const UserProfile = withRSCTrace(
  async function UserProfile({ userId }: { userId: string }) {
    const user = await db.user.findUnique({ where: { id: userId } })

    if (!user) {
      throw new Error('User not found')
    }

    return (
      <div className="profile">
        <h1>{user.name}</h1>
        <p>{user.email}</p>
      </div>
    )
  },
  {
    componentName: 'UserProfile',
    performance: { enabled: true, warnThreshold: 500 }
  }
)`}
      />

      <Separator />

      <section className="py-24 sm:py-[90px]">
        <div className="max-w-[1080px] mx-auto px-4">
          <div className="max-w-[780px] mx-auto mb-12">
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              See it in action
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Watch how quzz logs component execution in real-time with beautiful terminal output.
            </p>
          </div>

          <InteractiveDemo />
        </div>
      </section>

      <Separator />

      <section className="py-24 sm:py-[90px]">
        <div className="max-w-[1080px] mx-auto px-4">
          <div className="max-w-[780px] mx-auto mb-12">
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Configure your workflow
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Customize quzz to match your debugging needs with flexible configuration options.
            </p>
          </div>

          <ConfigDemo />
        </div>
      </section>

      <Separator />

      <section className="py-24 sm:py-[90px]">
        <div className="max-w-[1080px] mx-auto px-4">
          <div className="max-w-[780px] mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Production-ready features
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Everything you need to debug and monitor React Server Components in development and production.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="mb-3">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Performance tracking</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Automatic monitoring of component render times with configurable warning thresholds and memory tracking.
              </p>
            </div>

            <div>
              <div className="mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Error context</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Enhanced error traces capture full context, props, and stack traces for faster debugging.
              </p>
            </div>

            <div>
              <div className="mb-3">
                <Network className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Component hierarchy</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Visualize parent-child relationships and trace execution flow through nested components.
              </p>
            </div>

            <div>
              <div className="mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Zero overhead</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Conditionally enable in development only. No performance impact in production builds.
              </p>
            </div>

            <div>
              <div className="mb-3">
                <Code2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Type-safe</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Built with TypeScript for full type safety and excellent IDE autocomplete support.
              </p>
            </div>

            <div>
              <div className="mb-3">
                <Settings className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-2">Flexible configuration</h3>
              <p className="text-base text-muted-foreground leading-relaxed">
                Customize log levels, output formats, and performance thresholds per component or globally.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      <section id="get-started" className="py-24 sm:py-[90px]">
        <div className="max-w-[1080px] mx-auto px-4">
          <div className="max-w-[780px] mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Get started in seconds
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Install quzz and wrap your first component in under a minute.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-sm font-bold mb-3">1. Install</div>
              <div className="rounded-lg border bg-muted p-4 mb-4">
                <code className="text-sm">npm install quzz</code>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Available on npm with zero dependencies
              </p>
            </div>

            <div>
              <div className="text-sm font-bold mb-3">2. Wrap</div>
              <div className="rounded-lg border bg-muted p-4 mb-4">
                <code className="text-sm block">
                  import &#123; withRSCTrace &#125; from 'quzz'
                  <br />
                  <br />
                  export default withRSCTrace(MyComponent)
                </code>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Use the HOC to enable debugging
              </p>
            </div>

            <div>
              <div className="text-sm font-bold mb-3">3. Run</div>
              <div className="rounded-lg border bg-muted p-4 mb-4">
                <code className="text-sm block">
                  npm run dev
                  <br />
                  <br />
                  ℹ️ [quzz] MyComponent (42ms)
                </code>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                See logs instantly in your dev server
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
