
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow flex items-center justify-center py-16">
        <Container>
          <div className="text-center">
            <h1 className="text-9xl font-bold text-primary">404</h1>
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Page not found</h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-md mx-auto">
              Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
            </p>
            <div className="mt-10">
              <Button asChild size="lg">
                <Link to="/">Back to home</Link>
              </Button>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

export default NotFound;
