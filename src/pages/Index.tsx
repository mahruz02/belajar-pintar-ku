import { useEffect, useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { MobileOptimizedDashboard } from "@/components/MobileOptimizedDashboard";
import { useAccessibility } from "@/components/AccessibilityProvider";

const Index = () => {
  const [isMobile, setIsMobile] = useState(false);
  const { reducedMotion } = useAccessibility();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Use mobile-optimized version on smaller screens
  if (isMobile) {
    return <MobileOptimizedDashboard />;
  }

  return <Dashboard />;
};

export default Index;