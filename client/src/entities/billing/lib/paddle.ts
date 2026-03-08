import {
  initializePaddle,
  type Paddle,
  type PaddleEventData,
} from "@paddle/paddle-js";

const listeners = new Set<(event: PaddleEventData) => void>();
let paddlePromise: Promise<Paddle> | null = null;

const resolveEnvironment = (): "sandbox" | "production" => {
  const env = import.meta.env.VITE_PADDLE_ENV;

  if (env === "sandbox" || env === "production") {
    return env;
  }

  return import.meta.env.DEV ? "sandbox" : "production";
};

const emitEvent = (event: PaddleEventData) => {
  listeners.forEach((listener) => {
    listener(event);
  });
};

export const getPaddle = async (): Promise<Paddle> => {
  if (!paddlePromise) {
    const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN;

    if (!token) {
      throw new Error("Missing VITE_PADDLE_CLIENT_TOKEN");
    }

    paddlePromise = initializePaddle({
      token,
      environment: resolveEnvironment(),
      eventCallback: emitEvent,
    }).then((paddle) => {
      if (!paddle) {
        throw new Error("Failed to initialize Paddle");
      }

      return paddle;
    });
  }

  return paddlePromise;
};

export const subscribeToPaddleEvents = (
  listener: (event: PaddleEventData) => void,
) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
