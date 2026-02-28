import { Check } from "lucide-react";
import {
  m as motion,
  LazyMotion,
  AnimatePresence,
  domAnimation,
  useReducedMotion,
} from "motion/react";

import { Button, Spinner } from "@/shared/components";
import { SubscriptionDeleteButton } from "@/features/subscription/delete-subscription";
import * as m from "@/i18n/messages";

type SubscriptionFormHeaderActionProps = {
  isDirty: boolean;
  isPending: boolean;
  subscriptionId?: string;
  subscriptionName?: string;
};

export const SubscriptionFormHeaderAction = ({
  isDirty,
  isPending,
  subscriptionId,
  subscriptionName,
}: SubscriptionFormHeaderActionProps) => {
  const shouldReduceMotion = useReducedMotion();

  if (!subscriptionId) {
    return <span className="size-11" aria-hidden />;
  }

  const motionProps = shouldReduceMotion
    ? {
        initial: false as const,
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 1, scale: 1, y: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { opacity: 0, scale: 0.92, y: -2 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.92, y: 2 },
        transition: { duration: 0.16, ease: "easeOut" as const },
      };

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex size-11 items-center justify-center">
        <AnimatePresence mode="wait" initial={false}>
          {isDirty ? (
            <motion.div key="save" {...motionProps}>
              <Button
                type="submit"
                variant="default"
                size="icon"
                aria-label={m.form_buttons_update()}
                disabled={isPending}
                className="size-11 rounded-full"
              >
                {isPending ? <Spinner /> : <Check className="size-4" />}
                <span className="sr-only">{m.form_buttons_update()}</span>
              </Button>
            </motion.div>
          ) : (
            <motion.div key="delete" {...motionProps}>
              <SubscriptionDeleteButton
                subscriptionId={subscriptionId}
                subscriptionName={subscriptionName}
                className="size-11 rounded-full"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LazyMotion>
  );
};
