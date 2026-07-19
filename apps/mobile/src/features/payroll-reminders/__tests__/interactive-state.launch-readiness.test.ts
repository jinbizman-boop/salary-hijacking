import { formatKrw, getKstParts, parseKrwInput } from "../interactive-state";

describe("payroll reminder state launch readiness helpers", () => {
  it("formats and parses KRW as non-negative integer display values", () => {
    expect(formatKrw(0)).toBe("0원");
    expect(formatKrw(15000.9)).toBe("15,000원");
    expect(parseKrwInput("15,000원")).toBe(15000);
    expect(parseKrwInput("-900.75")).toBe(90075);
    expect(parseKrwInput("")).toBe(0);
  });

  it("derives Korean calendar text from Asia/Seoul timezone across UTC date boundaries", () => {
    expect(getKstParts(new Date("2026-07-11T15:00:00.000Z"))).toEqual({
      dateKey: "2026-07-12",
      day: 12,
      month: 7,
      monthKey: "2026-07",
      text: "2026년 7월 12일",
      year: 2026,
    });
    expect(getKstParts(new Date("2028-02-28T15:00:00.000Z"))).toEqual({
      dateKey: "2028-02-29",
      day: 29,
      month: 2,
      monthKey: "2028-02",
      text: "2028년 2월 29일",
      year: 2028,
    });
  });
});
