import { CodeBlock } from "@/components/code-block"
import { Separator } from "@/components/ui"

interface FeatureExampleProps {
  title: string
  description: string
  codeExample: string
  language?: string
  reverse?: boolean
}

export function FeatureExample({
  title,
  description,
  codeExample,
  language = "typescript",
  reverse = false,
}: FeatureExampleProps) {
  return (
    <section className="py-24 sm:py-[90px]">
      <div className="max-w-[900px] mx-auto px-4">
        <div
          className={`grid lg:grid-cols-2 gap-12 items-center ${
            reverse ? "lg:flex-row-reverse" : ""
          }`}
        >
          <div className={reverse ? "lg:order-2" : ""}>
            <h2 className="text-4xl font-bold tracking-tight mb-4">{title}</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          <div className={reverse ? "lg:order-1" : ""}>
            <CodeBlock code={codeExample} language={language} />
          </div>
        </div>
      </div>
    </section>
  )
}

export function FeatureExampleWithSeparator(props: FeatureExampleProps) {
  return (
    <>
      <FeatureExample {...props} />
      <Separator />
    </>
  )
}
