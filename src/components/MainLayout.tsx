"use client";

import { motion } from "framer-motion";
import { MaxContainer } from "./MaxContainer";

/**
 * Aether: Wise layout. MaxContainer + vertical rhythm (sections use py-20–py-32, gap-y-12).
 * Page content fades in on load.
 */
export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <MaxContainer className="py-12 md:py-20 lg:py-24">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex flex-col gap-y-8 md:gap-y-12"
      >
        {children}
      </motion.div>
    </MaxContainer>
  );
}
