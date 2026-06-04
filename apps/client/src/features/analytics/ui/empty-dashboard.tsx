import { Link } from "@tanstack/react-router";
import { Plus, Settings, Sparkles } from "lucide-react";
import { domAnimation, LazyMotion, m as motion } from "motion/react";
import type { FC } from "react";
import * as m from "@/i18n/messages";
import { Button } from "@/shared/components/ui/button";

type EmptyDashboardProps = {
  className?: string;
};

export const EmptyDashboard: FC<EmptyDashboardProps> = ({ className }) => {
  return (
    <LazyMotion features={domAnimation}>
      <div
        className={`flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 ${className ?? ""}`}
      >
        <div className="mx-auto max-w-md text-center">
          <div className="mb-6 flex justify-center">
            <motion.div
              className="relative rounded-full p-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
            >
              {/* Gradient background with animated glow */}
              <motion.div
                className="via-primary/20 absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/20 to-cyan-500/20"
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Inner glow */}
              <motion.div
                className="from-primary/30 absolute inset-1 rounded-full bg-gradient-to-tr to-violet-500/30 blur-sm"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* The sparkles icon */}
              <motion.div
                animate={{
                  rotate: [0, 5, -5, 0],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Sparkles className="text-primary relative z-10 size-10" />
              </motion.div>
            </motion.div>
          </div>

          <motion.h2
            className="mb-3 text-2xl font-semibold"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            {m.family_empty_title()}
          </motion.h2>

          <motion.p
            className="text-muted-foreground mb-8"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {m.family_empty_description()}
          </motion.p>

          <motion.div
            className="flex flex-col gap-3 sm:flex-row sm:justify-center"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Button asChild size="lg">
              <Link to="/subscriptions/add">
                <Plus className="mr-2 size-4" />
                {m.family_empty_addSubscription()}
              </Link>
            </Button>

            <Button variant="outline" asChild size="lg">
              <Link to="/settings/general">
                <Settings className="mr-2 size-4" />
                {m.family_empty_settings()}
              </Link>
            </Button>
          </motion.div>

          <motion.p
            className="text-muted-foreground mt-8 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {m.family_empty_hint()}
          </motion.p>
        </div>
      </div>
    </LazyMotion>
  );
};
