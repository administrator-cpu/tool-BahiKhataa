import Footer from "./common/shared/Footer";
import Navbar from "./common/shared/Navbar";
import BentoGrid from "./modules/landing/BentoGrid";
import Features from "./modules/landing/Features";
import Hero from "./modules/landing/Hero";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <Hero />
      <BentoGrid />
      <Features />
      <Footer />
    </main>
  );
}