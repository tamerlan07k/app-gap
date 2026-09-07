import { describe, expect, it } from "vitest";
import {
  classifyCourse,
  classifyCourses,
  resolveLevel,
  resolveSubject,
} from "./classify";

const raw = (name: string, type = "", gradeLevel = "", status = "") => ({
  name,
  type,
  status,
  gradeLevel,
  apExamScore: "",
});

describe("resolveLevel", () => {
  it("uses the explicit stored type first", () => {
    expect(resolveLevel("ap", "Biology")).toBe("ap");
    expect(resolveLevel("ib", "Biology")).toBe("ib");
    expect(resolveLevel("honors", "Biology")).toBe("honors");
    expect(resolveLevel("dual-enrollment", "Calc III")).toBe("dual-enrollment");
  });

  it("infers rigor from the name when type is other/blank", () => {
    expect(resolveLevel("other", "AP Biology")).toBe("ap");
    expect(resolveLevel("", "IB History HL")).toBe("ib");
    expect(resolveLevel("", "Honors Chemistry")).toBe("honors");
    expect(resolveLevel("", "Dual Enrollment English")).toBe("dual-enrollment");
  });

  it("defaults to regular when nothing signals rigor", () => {
    expect(resolveLevel("", "Algebra 1")).toBe("regular");
    expect(resolveLevel("other", "World Geography")).toBe("regular");
  });
});

describe("resolveSubject", () => {
  it("places computer science before generic science", () => {
    expect(resolveSubject("AP Computer Science A")).toEqual({
      subjectArea: "computer-science",
      topic: "computer-science",
      matched: true,
    });
  });

  it("detects finer math and science topics", () => {
    expect(resolveSubject("AP Calculus BC").topic).toBe("calculus");
    expect(resolveSubject("AP Statistics").topic).toBe("statistics");
    expect(resolveSubject("AP Physics C").topic).toBe("physics");
    expect(resolveSubject("AP Environmental Science").topic).toBe(
      "environmental-science",
    );
  });

  it("returns other/unmatched when no keyword applies", () => {
    expect(resolveSubject("Underwater Basket Weaving")).toEqual({
      subjectArea: "other",
      topic: null,
      matched: false,
    });
  });
});

describe("classifyCourse", () => {
  it("sets rigor weight and college-level flag from the level", () => {
    const ap = classifyCourse(raw("AP Calculus BC", "ap", "11"));
    expect(ap.level).toBe("ap");
    expect(ap.isCollegeLevel).toBe(true);
    expect(ap.rigorWeight).toBe(3);
    expect(ap.subjectArea).toBe("math");

    const reg = classifyCourse(raw("Algebra 2", "other", "10"));
    expect(reg.level).toBe("regular");
    expect(reg.isCollegeLevel).toBe(false);
    expect(reg.rigorWeight).toBe(1);
  });

  it("marks unclassifiable courses without dropping them", () => {
    const c = classifyCourse(raw("Study Hall"));
    expect(c.classified).toBe(false);
    expect(c.subjectArea).toBe("other");
  });
});

describe("classifyCourses", () => {
  it("drops blank-named rows but keeps everything else", () => {
    const out = classifyCourses([raw("AP Biology", "ap"), raw("  ")]);
    expect(out).toHaveLength(1);
    expect(out[0].subjectArea).toBe("science");
    expect(out[0].topic).toBe("biology");
  });
});
