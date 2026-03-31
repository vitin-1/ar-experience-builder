import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import WelcomePage from "@/components/WelcomePage";
import ARScene from "@/components/ARScene";

const Index = () => {
  const [showAR, setShowAR] = useState(false);

  return (
    <div className="fixed inset-0 w-screen h-screen pointer-events-none">
      <AnimatePresence mode="wait">
        {!showAR && <WelcomePage key="welcome" onStartAR={() => setShowAR(true)} />}
      </AnimatePresence>
      {showAR && <ARScene />}
    </div>
  );
};

export default Index;
