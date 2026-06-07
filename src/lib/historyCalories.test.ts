import { describe, it, expect } from "vitest";
import { buildDayCalorieEntry, formatCalorieDisplay } from "./historyCalories";

describe("buildDayCalorieEntry", () => {
  it("computes a positive net (surplus) when intake exceeds burn", () => {
    const e = buildDayCalorieEntry(2200, 400);
    expect(e).toEqual({ intake: 2200, burn: 400, net: 1800, hasCalories: true });
  });

  it("computes a negative net (deficit) when burn exceeds intake", () => {
    const e = buildDayCalorieEntry(1500, 2000);
    expect(e.net).toBe(-500);
    expect(e.hasCalories).toBe(true);
  });

  it("returns hasCalories=false when both are zero", () => {
    const e = buildDayCalorieEntry(0, 0);
    expect(e.hasCalories).toBe(false);
    expect(e.net).toBe(0);
  });

  it("returns hasCalories=true when only burn is recorded", () => {
    const e = buildDayCalorieEntry(0, 350);
    expect(e).toEqual({ intake: 0, burn: 350, net: -350, hasCalories: true });
  });

  it("returns hasCalories=true when only intake is recorded", () => {
    const e = buildDayCalorieEntry(1800, 0);
    expect(e).toEqual({ intake: 1800, burn: 0, net: 1800, hasCalories: true });
  });

  it("treats missing (undefined / null) values as zero", () => {
    expect(buildDayCalorieEntry(undefined, undefined).hasCalories).toBe(false);
    expect(buildDayCalorieEntry(null, 200)).toEqual({
      intake: 0,
      burn: 200,
      net: -200,
      hasCalories: true,
    });
  });

  it("clamps negative inputs to zero (defensive)", () => {
    const e = buildDayCalorieEntry(-100, -50);
    expect(e.intake).toBe(0);
    expect(e.burn).toBe(0);
    expect(e.hasCalories).toBe(false);
  });

  it("rounds fractional values", () => {
    const e = buildDayCalorieEntry(1999.4, 200.6);
    expect(e.intake).toBe(1999);
    expect(e.burn).toBe(201);
    expect(e.net).toBe(1798);
  });
});

describe("formatCalorieDisplay", () => {
  it("formats net surplus with a leading +", () => {
    const d = formatCalorieDisplay(buildDayCalorieEntry(2200, 400), "net");
    expect(d.label).toBe("+1,800 net");
  });

  it("formats net deficit with a negative sign", () => {
    const d = formatCalorieDisplay(buildDayCalorieEntry(1500, 2000), "net");
    expect(d.label).toBe("-500 net");
  });

  it("formats net zero without a sign", () => {
    const d = formatCalorieDisplay(buildDayCalorieEntry(500, 500), "net");
    expect(d.label).toBe("0 net");
  });

  it("formats split mode as intake / burn", () => {
    const d = formatCalorieDisplay(buildDayCalorieEntry(2200, 400), "split");
    expect(d.label).toBe("2,200 in / 400 out");
  });

  it("includes a breakdown tooltip in both modes", () => {
    const entry = buildDayCalorieEntry(2200, 400);
    expect(formatCalorieDisplay(entry, "net").tooltip).toBe("Intake 2,200 − Burn 400");
    expect(formatCalorieDisplay(entry, "split").tooltip).toBe("Intake 2,200 − Burn 400");
  });
});
