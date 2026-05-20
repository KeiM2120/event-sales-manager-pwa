import { describe, expect, it } from "vitest";
import { EventSalesDatabase } from "./database";
import { createRepositories } from "./repositories";

describe("repositories", () => {
  it("exposes repositories for each app table", () => {
    const db = new EventSalesDatabase("test-repositories");
    const repositories = createRepositories(db);

    expect(Object.keys(repositories).sort()).toEqual(
      [
        "bundleItems",
        "bundles",
        "eventInventories",
        "events",
        "expenses",
        "products",
        "sales",
      ].sort(),
    );

    db.close();
  });
});
