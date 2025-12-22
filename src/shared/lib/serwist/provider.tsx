"use client";

import { FC, PropsWithChildren } from "react";
import { SerwistProvider as Prov } from "@serwist/turbopack/react";

export const SerwistProvider: FC<PropsWithChildren> = ({ children }) => {
  return <Prov swUrl="/serwist/sw.js">{children}</Prov>;
};
