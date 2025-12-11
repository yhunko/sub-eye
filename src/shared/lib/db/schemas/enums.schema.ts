import { pgEnum } from "drizzle-orm/pg-core";
import { Period } from "../model/enums";

export const periodEnum = pgEnum("period", Period);
