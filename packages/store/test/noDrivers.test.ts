import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

// @subeye/store reaches storage only through its injected ports. A driver here
// would couple every consumer to one runtime — the server to Postgres, or the
// app to SQLite — which is the whole thing the ports exist to prevent.
const DRIVERS = [
  "drizzle-orm",
  "@neondatabase/serverless",
  "react-native-mmkv",
  "expo-sqlite",
];

// Read rather than import: a typed JSON import narrows to the fields that
// happen to exist today, so `devDependencies` would not even compile.
const pkg = JSON.parse(
  readFileSync(`${import.meta.dir}/../package.json`, "utf8"),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

test("declares no storage driver", () => {
  const declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  expect(declared.filter((name) => DRIVERS.includes(name))).toEqual([]);
});
