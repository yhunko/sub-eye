export {};

declare global {
  interface Navigator {
    /**
     * Boolean property indicating if the browser is running
     * in standalone mode. Available on Apple iOS Safari.
     */
    standalone?: boolean;
  }
}
