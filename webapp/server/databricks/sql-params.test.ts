import { describe, expect, it } from "vitest";
import { decodeRows, sql, toApiParameters } from "./sql-params";

describe("toApiParameters", () => {
  it("transmet les paramètres cités, omet la valeur d'un NULL et ignore les autres", () => {
    const statement = "SELECT * FROM t WHERE a = :name AND b = :amount AND c = :missing";
    const params = {
      name: sql.string("x"),
      amount: sql.money(12.3),
      missing: sql.string(null),
      unused: sql.int(1),
    };
    expect(toApiParameters(statement, params)).toEqual([
      { name: "name", type: "STRING", value: "x" },
      { name: "amount", type: "DECIMAL(12,2)", value: "12.30" },
      { name: "missing", type: "STRING" },
    ]);
  });

  it("ne confond pas un paramètre avec un autre dont il est le préfixe", () => {
    const params = { id: sql.string("a"), id1: sql.string("b") };
    expect(toApiParameters("WHERE x = :id1", params).map((p) => p.name)).toEqual(["id1"]);
  });
});

describe("decodeRows", () => {
  it("convertit les valeurs texte de l'API selon le type de colonne", () => {
    const columns = [
      { name: "amount", type_name: "DECIMAL" },
      { name: "count", type_name: "LONG" },
      { name: "active", type_name: "BOOLEAN" },
      { name: "at", type_name: "TIMESTAMP" },
      { name: "label", type_name: "STRING" },
    ];
    const [row] = decodeRows(columns, [["12.30", "3", "true", "2026-10-29T10:00:00.000Z", null]]);
    expect(row).toEqual({
      amount: 12.3,
      count: 3,
      active: true,
      at: "2026-10-29T10:00:00.000Z",
      label: null,
    });
  });
});
