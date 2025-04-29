
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/Container";

interface HeroProps {
  title?: string;
  description?: string;
}

export function Hero({ 
  title = "Build amazing things with ease", 
  description = "A powerful, flexible platform to bring your ideas to life. Start building your next great project with our intuitive tools." 
}: HeroProps) {
  return (
    <div className="relative py-20 md:py-28 overflow-hidden bg-background">
      <Container>
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            {description}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg">Get Started</Button>
            <Button variant="outline" size="lg">
              Learn more
            </Button>
          </div>
        </div>
      </Container>
      
      {/* Abstract background decoration */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
    </div>
  );
}
