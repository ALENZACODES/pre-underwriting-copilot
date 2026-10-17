const E = require("../engine.js"),
  assert = require("assert");
let n = 0;
const ok = (c, m) => {
  assert(c, m);
  n++;
};
global.window = {};
require("../samples.js");
const S = window.SAMPLES;
ok(E.qualifyingRate(3) === 5.25, "floor");
ok(E.qualifyingRate(4.19) === 6.19, "plus 2");
ok(Math.abs(E.payment(120000, 0, 120) - 1000) < 1e-9, "zero rate");
const a = E.review(S.clean);
ok(a.status === "Ready for lender review", "clean status " + a.status + JSON.stringify(a.flags));
ok(Math.abs(a.ratios.loan - 551000) < 1e-9, "loan");
ok(Math.abs(a.ratios.ltv - (551000 / 689000) * 100) < 1e-9, "ltv");
const inc = 142000 / 12,
  h = a.ratios.qualPmt + 5100 / 12 + 110;
ok(Math.abs(a.ratios.gds - (h / inc) * 100) < 1e-9, "gds");
ok(Math.abs(a.ratios.tds - ((h + 420) / inc) * 100) < 1e-9, "tds");
ok(!a.ratios.insured, "conventional");
const b = E.review(S.messy);
ok(b.status === "Not ready", "messy");
ok(Math.abs(b.ratios.minDown - (25000 + 220000 * 0.1)) < 1e-9, "min down " + b.ratios.minDown);
ok(
  b.flags.some((f) => /below the federal minimum/.test(f.msg)),
  "down flag",
);
ok(
  b.flags.some((f) => /does not match/.test(f.msg)),
  "name flag",
);
ok(
  b.flags.some((f) => /ID expired/.test(f.msg)),
  "id flag",
);
ok(
  b.flags.some((f) => /gift letter/.test(f.msg)),
  "gift letter",
);
ok(
  b.flags.some((f) => /business financials/.test(f.msg)),
  "self-employed docs",
);
ok(b.flags[0].level === "high", "sorted");
ok(
  E.review("Borrower: X").flags.some((f) => /not marked/.test(f.msg)),
  "example marker",
);
ok(E.memo(a).join("\n").includes("GDS"), "memo");
ok(
  Math.abs(E.review(S.clean.replace("689000", "400000").replace("138000", "20000")).ratios.minDown - 20000) < 1e-9,
  "5% tier",
);
console.log("pre-underwriting-copilot: " + n + " assertions passed");
