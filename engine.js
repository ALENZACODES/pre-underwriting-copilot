// Rule-based pre-underwriting review for fictional loan files.
(function (root) {
  const mi = (r) => Math.pow(1 + r / 200, 1 / 6) - 1;
  function payment(P, i, n) {
    if (i === 0) return P / n;
    return (P * i) / (1 - Math.pow(1 + i, -n));
  }
  const qualifyingRate = (c) => Math.max(5.25, c + 2);
  const num = (s) => (s == null ? NaN : +String(s).replace(/[$,%\s]/g, ""));
  function parse(text) {
    const f = {},
      docs = [];
    let sec = "";
    String(text)
      .split(/\r?\n/)
      .forEach((line) => {
        const t = line.trim();
        if (!t || t.startsWith("#")) return;
        if (/^documents?:?$/i.test(t)) {
          sec = "docs";
          return;
        }
        if (sec === "docs" && /^[-*]/.test(t)) {
          const m = t
            .replace(/^[-*]\s*/, "")
            .split("|")
            .map((x) => x.trim());
          docs.push({ type: m[0].toLowerCase(), date: m[1] || "", name: m[2] || "" });
          return;
        }
        const i = t.indexOf(":");
        if (i > 0) {
          sec = "";
          f[t.slice(0, i).trim().toLowerCase()] = t.slice(i + 1).trim();
        }
      });
    return { f, docs };
  }
  const days = (a, b) => (new Date(b) - new Date(a)) / 864e5;
  function review(text) {
    const { f, docs } = parse(text),
      flags = [],
      checks = [];
    const add = (level, msg) => flags.push({ level, msg });
    const price = num(f["purchase price"]),
      down = num(f["down payment"]),
      rate = num(f["contract rate"]),
      am = num(f["amortization"]) || 25;
    const income = num(f["annual income"]),
      tax = num(f["property tax"]) || 0,
      heat = num(f["heating"]) || 0,
      condo = num(f["condo fees"]) || 0,
      debts = num(f["monthly debts"]) || 0;
    const app = f["application date"],
      name = (f["borrower"] || "").toLowerCase(),
      score = num(f["credit score"]),
      emp = (f["employment"] || "").toLowerCase();
    if (!/\[example\]/i.test(text)) add("high", "File is not marked [EXAMPLE]. Use fictional data only.");
    [
      ["purchase price", price],
      ["down payment", down],
      ["contract rate", rate],
      ["annual income", income],
    ].forEach(([k, v]) => {
      if (!isFinite(v)) add("high", "Missing or unreadable field: " + k + ".");
    });
    const need = ["id", "pay stub", "employment letter", "noa", "down payment statement", "purchase agreement"];
    if (emp.includes("self")) need.splice(1, 2, "t1 general", "business financials");
    if ((f["gift"] || "").toLowerCase().startsWith("y")) need.push("gift letter");
    need.forEach((d) => {
      const doc = docs.find((x) => x.type === d);
      checks.push({ doc: d, ok: !!doc });
      if (!doc) add("medium", "Missing document: " + d + ".");
    });
    docs.forEach((d) => {
      if (d.name && name && d.name.toLowerCase() !== name)
        add("high", `Name on ${d.type} (${d.name}) does not match borrower (${f["borrower"]}).`);
      if (app && d.date && d.type === "pay stub" && days(d.date, app) > 30)
        add("medium", `Pay stub dated ${d.date} is more than 30 days before application.`);
      if (app && d.date && d.type === "down payment statement" && days(d.date, app) > 30)
        add("low", "Down payment statement is older than 30 days; most lenders want a recent 90-day history.");
      if (app && d.date && d.type === "id" && new Date(d.date) < new Date(app))
        add("high", "ID expired before the application date.");
    });
    const r = {};
    if (isFinite(price) && isFinite(down) && isFinite(rate) && isFinite(income)) {
      r.loan = price - down;
      r.ltv = (r.loan / price) * 100;
      r.downPct = (down / price) * 100;
      r.qr = qualifyingRate(rate);
      r.qualPmt = payment(r.loan, mi(r.qr), am * 12);
      r.contractPmt = payment(r.loan, mi(rate), am * 12);
      const inc = income / 12,
        h = r.qualPmt + tax / 12 + heat + 0.5 * condo;
      r.gds = (h / inc) * 100;
      r.tds = ((h + debts) / inc) * 100;
      r.minDown = price <= 500000 ? price * 0.05 : price < 1500000 ? 25000 + (price - 500000) * 0.1 : price * 0.2;
      if (down < r.minDown)
        add(
          "high",
          `Down payment ${down.toLocaleString("en-CA")} is below the federal minimum of ${Math.round(r.minDown).toLocaleString("en-CA")}.`,
        );
      r.insured = r.ltv > 80;
      if (r.insured && am > 30) add("high", "Insured mortgages are limited to 30-year amortization at most.");
      if (r.gds > 39) add("high", `GDS ${r.gds.toFixed(1)}% exceeds 39% at the ${r.qr.toFixed(2)}% qualifying rate.`);
      else if (r.gds > 35) add("low", `GDS ${r.gds.toFixed(1)}% is within limits but has thin headroom.`);
      if (r.tds > 44) add("high", `TDS ${r.tds.toFixed(1)}% exceeds 44% at the qualifying rate.`);
      else if (r.tds > 40) add("low", `TDS ${r.tds.toFixed(1)}% is close to the 44% limit.`);
    }
    if (isFinite(score)) {
      if (score < 600) add("high", "Credit score under 600; expect alternative or private lending only.");
      else if (r.insured && score < 680)
        add(
          "medium",
          "Insured file with score under 680; at least one borrower usually needs 600+, and pricing tightens.",
        );
    }
    const rank = { high: 0, medium: 1, low: 2 };
    flags.sort((a, b) => rank[a.level] - rank[b.level]);
    const hi = flags.filter((x) => x.level === "high").length,
      me = flags.filter((x) => x.level === "medium").length;
    const status = hi ? "Not ready" : me ? "Conditional" : "Ready for lender review";
    return {
      fields: f,
      docs,
      checks,
      ratios: r,
      flags,
      status,
      score: Math.max(0, 100 - hi * 25 - me * 10 - (flags.length - hi - me) * 3),
    };
  }
  function memo(res) {
    const f = res.fields,
      r = res.ratios,
      m = (v) => "$" + Math.round(v).toLocaleString("en-CA");
    const L = [
      "BROKER PRE-UNDERWRITING MEMO [EXAMPLE]",
      "",
      `Borrower: ${f["borrower"] || "n/a"}   File: ${f["file id"] || "n/a"}   Province: ${f["province"] || "n/a"}`,
      `Status: ${res.status} (readiness ${res.score}/100)`,
      "",
    ];
    if (r.loan)
      L.push(
        "Deal",
        `Purchase ${m(+f["purchase price"].replace(/[$,]/g, ""))}, loan ${m(r.loan)}, LTV ${r.ltv.toFixed(1)}% (${r.insured ? "insured" : "conventional"}).`,
        `Contract payment ${m(r.contractPmt)}/mo. Qualified at ${r.qr.toFixed(2)}%: ${m(r.qualPmt)}/mo.`,
        `GDS ${r.gds.toFixed(1)}% (limit 39), TDS ${r.tds.toFixed(1)}% (limit 44).`,
        "",
      );
    L.push("Documents", ...res.checks.map((c) => `  ${c.ok ? "[x]" : "[ ]"} ${c.doc}`), "", "Flags");
    if (!res.flags.length) L.push("  None found.");
    res.flags.forEach((x) => L.push(`  ${x.level.toUpperCase()}: ${x.msg}`));
    L.push(
      "",
      "Next steps",
      res.flags.length
        ? "  Clear the high flags first, then collect missing documents before lender submission."
        : "  Package the file for lender submission.",
      "",
      "Prepared for education on a fictional file. Not a credit decision.",
    );
    return L;
  }
  const api = { parse, review, memo, qualifyingRate, payment, mi };
  if (typeof module !== "undefined") module.exports = api;
  else root.Engine = api;
})(this);
