// Root to Rise family registration.
// Opens only from the private link staff send (?k=<student record id>) after the child is
// accepted and "Registration status" is set to "Ready for registration" in Airtable.
// Add &demo to the link to preview the page with sample data (nothing is sent).
(function () {
  const cfg = window.R2R_CONFIG || {};
  const API = (cfg.API_BASE || "").replace(/\/+$/, "");
  const params = new URLSearchParams(location.search);
  const key = params.get("k") || "";
  const DEMO = params.has("demo") || !API;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = { birthday: "", child: null, answers: null, docs: [], checklist: [], step: 0 };

  // ---------- API ----------
  async function call(action, body) {
    if (DEMO) return demo(action, body);
    const res = await fetch(`${API}/register/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ k: key, birthday: state.birthday, ...body }),
    });
    let data = {};
    try { data = await res.json(); } catch {}
    if (!res.ok || !data.ok) throw Object.assign(new Error(data.error || "server"), { data });
    return data;
  }

  // ---------- Views ----------
  function show(id) {
    $$(".view").forEach((v) => (v.hidden = v.id !== id));
    const v = document.getElementById(id);
    if (v && v.classList.contains("message")) v.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const CLOSED = {
    nolink: ["Use the link from your email", "Registration opens from the private link we email you once your child is accepted. If you can't find it, email us and we'll resend it."],
    not_found: ["We couldn't find that registration", "The link may be incomplete. Try opening it straight from your email, or email us and we'll resend it."],
    not_open: ["Registration isn't open yet", "We'll email you as soon as your child's registration is ready. If you think it should be open, email us."],
    submitted: ["Registration already sent", "Thank you! We have your child's registration. If you need to change something, email us and we'll help."],
    locked: ["This registration is locked", "Too many incorrect birthdays were entered, so we've locked this link to protect your child's information. Email us and we'll unlock it."],
  };
  function closed(kind) {
    const [t, b] = CLOSED[kind] || ["Something went wrong", "Please try again in a moment, or email us."];
    $("#closed-title").textContent = t;
    $("#closed-body").textContent = b;
    show("view-closed");
  }

  // ---------- Birthday gate ----------
  const gate = $("#view-gate");
  gate.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = gate.elements.birthday;
    const err = $(".form-error", gate);
    err.hidden = true;
    input.classList.remove("invalid");
    if (!input.value) { input.classList.add("invalid"); input.focus(); return; }
    const btn = $("button", gate);
    btn.disabled = true; btn.textContent = "Checking…";
    state.birthday = input.value;
    try {
      const d = await call("open");
      Object.assign(state, { child: d.child, answers: d.answers, docs: d.docs, checklist: d.checklist });
      startForm();
    } catch (ex) {
      const code = ex.message;
      if (code === "mismatch") {
        const left = ex.data && ex.data.triesLeft;
        err.textContent = `That birthday doesn't match our records. ${left ? `${left} ${left === 1 ? "try" : "tries"} left.` : ""}`;
        err.hidden = false;
        input.classList.add("invalid");
      } else if (CLOSED[code]) {
        closed(code);
      } else {
        err.textContent = "We couldn't connect. Please check your internet and try again.";
        err.hidden = false;
      }
    } finally {
      btn.disabled = false; btn.textContent = "Continue";
    }
  });

  // ---------- Form ----------
  const stepForms = $$("#view-form .step");
  const s1 = stepForms[0], s3 = stepForms[2];

  function startForm() {
    const name = state.answers.preferredName || state.child.first || "your child";
    $("#form-title").textContent = `Registering ${name}`;
    $("#intro-title").innerHTML = `Welcome,<br />${escapeHtml(name)}.`;
    fill(state.answers);
    if (cfg.HANDBOOK_URL) {
      $("#handbook-text").innerHTML = `I've read the <a href="${encodeURI(cfg.HANDBOOK_URL)}" target="_blank" rel="noopener">Root to Rise family handbook</a> and agree to its policies.`;
    }
    show("view-form");
    goTo(0);
  }

  function goTo(n) {
    state.step = n;
    stepForms.forEach((f) => (f.hidden = Number(f.dataset.step) !== n));
    $$(".steps li").forEach((li) => {
      const i = Number(li.dataset.step);
      li.classList.toggle("current", i === n);
      li.classList.toggle("done", i < n);
      if (i === n) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    const subs = [
      "Tell us about your child and the people in their circle.",
      "Upload your child's records. You can add more later from this same link.",
      "A few permissions, then you're done.",
    ];
    $("#form-sub").textContent = subs[n];
    $("#back-btn").hidden = n === 0;
    $("#next-btn").textContent = n === 2 ? "Submit registration" : "Save and continue";
    $("#step-error").hidden = true;
    $("#missing").hidden = true;
    if (n === 1) renderDocs();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Answers <-> inputs
  function fill(a) {
    s1.elements.preferredName.value = a.preferredName;
    s1.elements.pediatrician.value = a.pediatrician;
    s1.elements.hasMedical.checked = a.hasMedical;
    s1.elements.allergies.value = a.allergies;
    $$('input[name="supportPlan"]', s1).forEach((c) => (c.checked = a.supportPlan.includes(c.value)));
    s1.elements.address.value = a.address;
    s1.elements.g2name.value = a.guardian2.name;
    s1.elements.g2relationship.value = a.guardian2.relationship;
    s1.elements.g2phone.value = a.guardian2.phone;
    s1.elements.g2email.value = a.guardian2.email;
    s1.elements.hasCustody.checked = a.hasCustody;
    s1.elements.pickupNotes.value = a.pickupNotes;
    renderPeople("emergency", a.emergency, 2);
    renderPeople("pickups", a.pickups, 2);
    s3.elements.medicalConsent.checked = a.medicalConsent;
    s3.elements.photoConsent.checked = a.photoConsent;
    s3.elements.handbook.checked = a.handbook;
    s3.elements.signedBy.value = a.signedBy;
    syncReveals();
  }

  function collect() {
    const v = (el) => el.value.trim();
    return {
      preferredName: v(s1.elements.preferredName),
      pediatrician: v(s1.elements.pediatrician),
      hasMedical: s1.elements.hasMedical.checked,
      allergies: v(s1.elements.allergies),
      supportPlan: $$('input[name="supportPlan"]:checked', s1).map((c) => c.value),
      address: v(s1.elements.address),
      guardian2: { name: v(s1.elements.g2name), relationship: v(s1.elements.g2relationship), phone: v(s1.elements.g2phone), email: v(s1.elements.g2email) },
      hasCustody: s1.elements.hasCustody.checked,
      emergency: readPeople("emergency"),
      pickups: readPeople("pickups"),
      pickupNotes: v(s1.elements.pickupNotes),
      medicalConsent: s3.elements.medicalConsent.checked,
      photoConsent: s3.elements.photoConsent.checked,
      handbook: s3.elements.handbook.checked,
      signedBy: v(s3.elements.signedBy),
    };
  }

  function syncReveals() {
    $$(".reveal", s1).forEach((r) => (r.hidden = !s1.elements[r.dataset.when].checked));
  }
  s1.addEventListener("change", syncReveals);

  // People repeaters
  function personRow(p = {}) {
    const row = document.createElement("div");
    row.className = "person";
    row.innerHTML = `
      <label>Name<input data-k="name" autocomplete="off" /></label>
      <label>Relationship<input data-k="relationship" placeholder="e.g. Aunt" /></label>
      <label>Phone<input data-k="phone" type="tel" inputmode="tel" /></label>
      <button type="button" class="remove-person" aria-label="Remove">×</button>`;
    $$("input", row).forEach((i) => (i.value = p[i.dataset.k] || ""));
    $(".remove-person", row).addEventListener("click", () => {
      const list = row.parentElement;
      row.remove();
      if (!list.children.length) list.appendChild(personRow());
      syncAddButtons();
    });
    return row;
  }
  function renderPeople(list, people, min) {
    const box = $(`.people[data-list="${list}"]`);
    box.innerHTML = "";
    const rows = people.length ? people : [];
    rows.forEach((p) => box.appendChild(personRow(p)));
    while (box.children.length < min) box.appendChild(personRow());
    syncAddButtons();
  }
  function readPeople(list) {
    return $$(`.people[data-list="${list}"] .person`).map((row) => {
      const o = {};
      $$("input", row).forEach((i) => (o[i.dataset.k] = i.value.trim()));
      return o;
    }).filter((p) => p.name || p.phone);
  }
  function syncAddButtons() {
    $$(".add-person").forEach((b) => {
      const box = $(`.people[data-list="${b.dataset.list}"]`);
      b.hidden = box.children.length >= Number(box.dataset.max);
    });
  }
  $$(".add-person").forEach((b) =>
    b.addEventListener("click", () => {
      const box = $(`.people[data-list="${b.dataset.list}"]`);
      box.appendChild(personRow());
      $("input", box.lastElementChild).focus();
      syncAddButtons();
    }),
  );

  // ---------- Documents ----------
  function visibleChecklist() {
    const a = collect();
    const on = {
      medical: a.hasMedical,
      iep: a.supportPlan.includes("IEP"),
      504: a.supportPlan.includes("504 Plan"),
      custody: a.hasCustody,
    };
    return state.checklist.filter((c) => !c.when || on[c.when]);
  }

  function renderDocs() {
    const ul = $("#doc-list");
    ul.innerHTML = "";
    visibleChecklist().forEach((item) => {
      const mine = state.docs.filter((d) => d.type === item.type && d.files.length);
      const li = document.createElement("li");
      li.className = "doc" + (mine.length ? " has" : "");
      li.innerHTML = `
        <div class="doc-head">
          <span class="doc-mark" aria-hidden="true">${mine.length ? "✓" : ""}</span>
          <div>
            <strong>${escapeHtml(item.label)}</strong>
            ${item.required ? '<span class="tag">Required</span>' : ""}
            <span class="doc-help">${escapeHtml(item.help)}</span>
          </div>
        </div>
        <ul class="doc-files"></ul>
        <label class="upload-btn">
          <input type="file" accept="application/pdf,image/*" />
          <span>${mine.length ? "Add another file" : "Upload"}</span>
        </label>
        <p class="doc-status" aria-live="polite"></p>`;
      const files = $(".doc-files", li);
      mine.forEach((d) => d.files.forEach((name) => {
        const f = document.createElement("li");
        f.innerHTML = `<span>${escapeHtml(name)}</span>`;
        if (d.removable) {
          const rm = document.createElement("button");
          rm.type = "button"; rm.className = "link-btn small"; rm.textContent = "Remove";
          rm.addEventListener("click", () => removeDoc(d.id, $(".doc-status", li)));
          f.appendChild(rm);
        } else if (d.status === "Verified") {
          f.insertAdjacentHTML("beforeend", '<em class="verified">Verified</em>');
        }
        files.appendChild(f);
      }));
      $('input[type="file"]', li).addEventListener("change", (e) => {
        const file = e.target.files[0];
        e.target.value = "";
        if (file) upload(item, file, $(".doc-status", li), li);
      });
      ul.appendChild(li);
    });
  }

  const TYPES_BY_EXT = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", heic: "image/heic", heif: "image/heif", webp: "image/webp" };
  const MAX = 5 * 1024 * 1024;

  async function upload(item, file, status, li) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const type = TYPES_BY_EXT[ext] || file.type;
    if (!Object.values(TYPES_BY_EXT).includes(type)) {
      status.textContent = "Please upload a PDF or a photo (JPG, PNG or HEIC)."; status.className = "doc-status err"; return;
    }
    if (file.size > MAX) {
      status.textContent = "That file is over 5 MB. Try a photo instead of a scan, or email it to us."; status.className = "doc-status err"; return;
    }
    li.classList.add("busy");
    status.textContent = "Uploading…"; status.className = "doc-status";
    try {
      const data = await toBase64(file);
      const d = await call("upload", { type: item.type, filename: file.name, contentType: type, data });
      state.docs = d.docs;
      renderDocs();
    } catch (ex) {
      li.classList.remove("busy");
      const msg = {
        too_large: "That file is over 5 MB. Try a photo instead of a scan.",
        file_type: "Please upload a PDF or a photo (JPG, PNG or HEIC).",
      }[ex.message] || (CLOSED[ex.message] ? null : "Upload didn't go through. Please try again.");
      if (!msg) return closed(ex.message);
      status.textContent = msg; status.className = "doc-status err";
    }
  }

  async function removeDoc(id, status) {
    status.textContent = "Removing…"; status.className = "doc-status";
    try {
      const d = await call("remove", { docId: id });
      state.docs = d.docs;
      renderDocs();
    } catch (ex) {
      status.textContent = ex.message === "locked_doc" ? "We've already reviewed this one. Email us if it needs to change." : "Couldn't remove that. Please try again.";
      status.className = "doc-status err";
    }
  }

  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result).split(",")[1] || "");
      r.onerror = () => reject(new Error("read"));
      r.readAsDataURL(file);
    });
  }

  // ---------- Navigation ----------
  function checkStep(n) {
    const a = collect();
    const bad = [];
    if (n === 0) {
      if (!a.address) bad.push(s1.elements.address);
      const firstEmergency = $('.people[data-list="emergency"] .person');
      if (!a.emergency.some((p) => p.name && p.phone)) bad.push($('input[data-k="name"]', firstEmergency));
      const firstPickup = $('.people[data-list="pickups"] .person');
      if (!a.pickups.some((p) => p.name)) bad.push($('input[data-k="name"]', firstPickup));
    }
    $$(".invalid").forEach((el) => el.classList.remove("invalid"));
    bad.forEach((el) => el.classList.add("invalid"));
    if (bad.length) {
      const err = $("#step-error");
      err.textContent = "Please add a home address, at least one emergency contact with a phone number, and at least one person who can pick up.";
      err.hidden = false;
      bad[0].focus();
      return false;
    }
    return true;
  }

  async function save(submit) {
    const btn = $("#next-btn");
    const err = $("#step-error");
    err.hidden = true;
    btn.disabled = true;
    const label = btn.textContent;
    btn.textContent = submit ? "Sending…" : "Saving…";
    try {
      state.answers = collect();
      await call("save", { answers: state.answers, submit });
      $("#saved-note").textContent = `Saved ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}. You can close this page and come back with the same link.`;
      return true;
    } catch (ex) {
      if (ex.message === "incomplete") {
        const box = $("#missing");
        $("ul", box).innerHTML = (ex.data.missing || []).map((m) => `<li>${escapeHtml(m)}</li>`).join("");
        box.hidden = false;
        box.scrollIntoView({ behavior: "smooth", block: "center" });
      } else if (CLOSED[ex.message]) {
        closed(ex.message);
      } else {
        err.textContent = "We couldn't save just now. Please check your connection and try again.";
        err.hidden = false;
      }
      return false;
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  $("#next-btn").addEventListener("click", async () => {
    const n = state.step;
    if (!checkStep(n)) return;
    if (n < 2) {
      if (await save(false)) goTo(n + 1);
      return;
    }
    if (await save(true)) {
      const name = state.answers.preferredName || state.child.first;
      $("#done-body").textContent = `Thank you! We have ${name}'s registration. We'll review everything and reach out if we need anything else.`;
      show("view-done");
    }
  });
  $("#back-btn").addEventListener("click", () => goTo(Math.max(0, state.step - 1)));
  $$(".steps li").forEach((li) => li.addEventListener("click", async () => {
    const n = Number(li.dataset.step);
    if (n < state.step) goTo(n);
  }));

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- Demo ----------
  const demoDocs = [];
  async function demo(action, body) {
    await new Promise((r) => setTimeout(r, 350));
    const checklist = [
      { type: "Immunization record", label: "Immunization record", help: "From your child's doctor.", required: true, when: null },
      { type: "Physical / health form", label: "Physical exam / health form", help: "Completed and signed by your child's doctor.", required: true, when: null },
      { type: "Allergy or medical action plan", label: "Allergy or medical action plan", help: "The plan from your child's doctor.", required: false, when: "medical" },
      { type: "Medication authorization", label: "Medication authorization", help: "Only if your child will need medicine while with us.", required: false, when: "medical" },
      { type: "IEP", label: "IEP", help: "The most recent copy.", required: false, when: "iep" },
      { type: "504 Plan", label: "504 plan", help: "The most recent copy.", required: false, when: "504" },
      { type: "Custody or court order", label: "Custody or court order", help: "Any order that affects who can pick up your child.", required: false, when: "custody" },
      { type: "Other", label: "Anything else", help: "Optional. Anything else you'd like us to have on file.", required: false, when: null },
    ];
    if (action === "open") {
      return {
        ok: true, child: { first: "Amara", last: "Sample" }, docs: demoDocs, checklist,
        answers: { preferredName: "", address: "", guardian2: { name: "", relationship: "", phone: "", email: "" }, pediatrician: "", hasMedical: false, allergies: "", supportPlan: [], hasCustody: false, emergency: [], pickups: [], pickupNotes: "", photoConsent: false, medicalConsent: false, handbook: false, signedBy: "" },
      };
    }
    if (action === "upload") {
      demoDocs.push({ id: "demo" + demoDocs.length, type: body.type, status: "Received", files: [body.filename], removable: true });
      return { ok: true, docs: demoDocs };
    }
    if (action === "remove") {
      demoDocs.splice(demoDocs.findIndex((d) => d.id === body.docId), 1);
      return { ok: true, docs: demoDocs };
    }
    if (action === "save" && body.submit) {
      const a = body.answers, m = [];
      ["Immunization record", "Physical / health form"].forEach((t) => { if (!demoDocs.some((d) => d.type === t)) m.push(t); });
      if (!a.medicalConsent) m.push("Emergency medical consent");
      if (!a.handbook) m.push("Family handbook acknowledgment");
      if (!a.signedBy) m.push("Your signature (typed full name)");
      if (m.length) throw Object.assign(new Error("incomplete"), { data: { missing: m } });
    }
    return { ok: true };
  }

  // ---------- Start ----------
  if (!key && !DEMO) closed("nolink");
  else show("view-gate");
})();
