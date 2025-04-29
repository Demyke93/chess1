
import { Container } from "@/components/ui/Container";
import { ArrowRight, LucideIcon, Shield, Zap, Layers } from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

const features: Feature[] = [
  {
    title: "Fast Performance",
    description: "Optimized for speed and efficiency, ensuring your application runs smoothly.",
    icon: Zap,
  },
  {
    title: "Secure by Default",
    description: "Built with security in mind, protecting your data and users at every step.",
    icon: Shield,
  },
  {
    title: "Modular Architecture",
    description: "A flexible, component-based approach that scales with your project.",
    icon: Layers,
  },
];

export function Features() {
  return (
    <section className="py-16 md:py-24">
      <Container>
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Features that empower you
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to build modern web applications, with tools designed for productivity and innovation.
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="group relative bg-card hover:bg-accent/40 transition-colors p-6 rounded-lg border border-border flex flex-col"
            >
              <div className="mb-4 bg-primary/10 rounded-full p-3 w-fit">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground flex-grow">{feature.description}</p>
              <div className="mt-6 flex items-center text-sm font-medium text-primary">
                <span>Learn more</span>
                <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
