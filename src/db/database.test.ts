import { describe, expect, it } from "vitest";
import { EventSalesDatabase, storeNames } from "./database";

describe("EventSalesDatabase", () => {
  it("declares all version 1 stores in one centralized schema", () => {
    const db = new EventSalesDatabase("test-schema");

    expect(db.tables.map((table) => table.name).sort()).toEqual(
      [...storeNames].sort(),
    );

    db.close();
  });
});
