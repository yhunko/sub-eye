"use client";
import { cn } from "@/shared/lib/classes-utils";
import {
  AnimatePresence,
  LazyMotion,
  Transition,
  domAnimation,
  m as motion,
} from "motion/react";
import {
  Children,
  cloneElement,
  isValidElement,
  ReactElement,
  ReactNode,
  useState,
  useId,
} from "react";

type AnimatedBackgroundChildProps = {
  "data-id": string;
  "data-checked"?: "true" | "false";
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

export type AnimatedBackgroundProps = {
  children:
    | ReactElement<AnimatedBackgroundChildProps>[]
    | ReactElement<AnimatedBackgroundChildProps>;
  defaultValue?: string;
  onValueChange?: (newActiveId: string | null) => void;
  className?: string;
  transition?: Transition;
  enableHover?: boolean;
};

export function AnimatedBackground({
  children,
  defaultValue,
  onValueChange,
  className,
  transition,
  enableHover = false,
}: AnimatedBackgroundProps) {
  const [activeId, setActiveId] = useState<string | null>(defaultValue ?? null);
  const uniqueId = useId();

  const handleSetActiveId = (id: string | null) => {
    setActiveId(id);

    if (onValueChange) {
      onValueChange(id);
    }
  };

  return Children.map(children, (child, index) => {
    if (!isValidElement<AnimatedBackgroundChildProps>(child)) {
      return child;
    }

    const id = child.props["data-id"];

    const interactionProps = enableHover
      ? {
          onMouseEnter: () => handleSetActiveId(id),
          onMouseLeave: () => handleSetActiveId(null),
        }
      : {
          onClick: () => handleSetActiveId(id),
        };

    return cloneElement(
      child,
      {
        key: id ?? `${uniqueId}-${index}`,
        className: cn("relative inline-flex", child.props.className),
        "data-checked": activeId === id ? "true" : "false",
        ...interactionProps,
      },
      <>
        <LazyMotion features={domAnimation}>
          <AnimatePresence initial={false}>
            {activeId === id && (
              <motion.div
                layoutId={`background-${uniqueId}`}
                className={cn("absolute inset-0", className)}
                transition={transition}
                initial={{ opacity: defaultValue ? 1 : 0 }}
                animate={{
                  opacity: 1,
                }}
                exit={{
                  opacity: 0,
                }}
              />
            )}
          </AnimatePresence>
        </LazyMotion>
        <div className="z-10">{child.props.children}</div>
      </>,
    );
  });
}
