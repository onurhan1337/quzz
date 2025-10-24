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

      <section className="relative py-24 sm:py-[90px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />

        <div className="max-w-[900px] mx-auto px-4 relative">
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

      <section className="relative py-24 sm:py-[90px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />

        <div className="max-w-[900px] mx-auto px-4 relative">
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

      <section className="py-24 sm:py-[90px] relative overflow-hidden">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />

        <div className="max-w-[900px] mx-auto px-4 relative">
          <div className="max-w-[680px] mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Production-ready features
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Everything you need to debug and monitor React Server Components in development and production.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <div className="relative">
                <div className="mb-4 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Performance tracking</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Automatic monitoring of component render times with configurable warning thresholds and memory tracking.
                </p>
              </div>
            </div>

            <div className="group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <div className="relative">
                <div className="mb-4 w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Error context</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enhanced error traces capture full context, props, and stack traces for faster debugging.
                </p>
              </div>
            </div>

            <div className="group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <div className="relative">
                <div className="mb-4 w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Network className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Component hierarchy</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Visualize parent-child relationships and trace execution flow through nested components.
                </p>
              </div>
            </div>

            <div className="group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <div className="relative">
                <div className="mb-4 w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Zero overhead</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Conditionally enable in development only. No performance impact in production builds.
                </p>
              </div>
            </div>

            <div className="group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <div className="relative">
                <div className="mb-4 w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Code2 className="w-6 h-6 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Type-safe</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Built with TypeScript for full type safety and excellent IDE autocomplete support.
                </p>
              </div>
            </div>

            <div className="group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/50">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <div className="relative">
                <div className="mb-4 w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Settings className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold mb-2">Flexible configuration</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Customize log levels, output formats, and performance thresholds per component or globally.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      <section id="get-started" className="relative py-24 sm:py-[90px] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-[900px] mx-auto px-4 relative">
          <div className="max-w-[680px] mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4">
              Get started in seconds
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Install quzz and wrap your first component in under a minute.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="group relative rounded-xl border border-border bg-card p-6 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    1
                  </div>
                  <div className="text-lg font-bold">Install</div>
                </div>
                <div className="rounded-lg bg-[#0d1117] border border-gray-800 p-4 mb-4 font-mono text-sm">
                  <code className="text-gray-300">npm install quzz</code>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Available on npm with zero dependencies
                </p>
              </div>
            </div>

            <div className="group relative rounded-xl border border-border bg-card p-6 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    2
                  </div>
                  <div className="text-lg font-bold">Wrap</div>
                </div>
                <div className="rounded-lg bg-[#0d1117] border border-gray-800 p-4 mb-4 font-mono text-sm">
                  <code className="text-gray-300 block">
                    <span className="text-[#ff7b72]">import</span> &#123; withRSCTrace &#125; <span className="text-[#ff7b72]">from</span> <span className="text-[#a5d6ff]">'quzz'</span>
                    <br />
                    <br />
                    <span className="text-[#ff7b72]">export default</span> withRSCTrace(MyComponent)
                  </code>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Use the HOC to enable debugging
                </p>
              </div>
            </div>

            <div className="group relative rounded-xl border border-border bg-card p-6 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/50 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    3
                  </div>
                  <div className="text-lg font-bold">Run</div>
                </div>
                <div className="rounded-lg bg-[#0d1117] border border-gray-800 p-4 mb-4 font-mono text-sm">
                  <code className="text-gray-300 block">
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
        </div>
      </section>

      <Footer />
    </main>
  )
}
