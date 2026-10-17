(function () {
  const $ = (s) => document.querySelector(s),
    E = window.Engine,
    m = (v) => "$" + Math.round(v).toLocaleString("en-CA");
  const esc = (s) =>
    String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function run() {
    const res = E.review($("#txt").value),
      r = res.ratios,
      col = res.status === "Not ready" ? "bad" : res.status === "Conditional" ? "warn" : "good";
    $("#kpis").innerHTML =
      `<div class="kpi"><div class="l">Readiness</div><div class="score ${col}">${res.score}</div><div class="s">${res.status}</div></div>` +
      (r.loan
        ? [
            ["Loan / LTV", m(r.loan), r.ltv.toFixed(1) + "% LTV, " + (r.insured ? "insured" : "conventional")],
            ["Qualifying rate", r.qr.toFixed(2) + "%", m(r.qualPmt) + "/mo tested"],
            ["GDS", r.gds.toFixed(1) + "%", "limit 39%", r.gds <= 39],
            ["TDS", r.tds.toFixed(1) + "%", "limit 44%", r.tds <= 44],
          ]
            .map(
              ([l, v, s, ok]) =>
                `<div class="kpi"><div class="l">${l}</div><div class="v ${ok === true ? "good" : ok === false ? "bad" : ""}">${v}</div><div class="s">${s}</div></div>`,
            )
            .join("")
        : "");
    $("#docs").innerHTML = res.checks
      .map(
        (c) =>
          `<div class="doc"><span class="pill ${c.ok ? "good" : "bad"}">${c.ok ? "Received" : "Missing"}</span> ${esc(c.doc)}</div>`,
      )
      .join("");
    $("#flags").innerHTML = res.flags.length
      ? res.flags
          .map(
            (f) =>
              `<div class="fl"><span class="pill ${f.level === "high" ? "bad" : f.level === "medium" ? "warn" : "good"}">${f.level}</span><span>${esc(f.msg)}</span></div>`,
          )
          .join("")
      : '<p class="good">No flags found.</p>';
    const memo = $("#memo");
    memo.textContent = "";
    E.memo(res).forEach((l) => {
      memo.append(l);
      memo.append(document.createElement("br"));
    });
  }
  document.querySelectorAll("[data-s]").forEach(
    (b) =>
      (b.onclick = () => {
        $("#txt").value = window.SAMPLES[b.dataset.s];
        run();
      }),
  );
  $("#file").onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    f.text().then((t) => {
      $("#txt").value = t;
      run();
    });
  };
  $("#run").onclick = run;
  $("#pdf").onclick = () => window.print();
  $("#txt").value = window.SAMPLES.messy;
  run();
})();
