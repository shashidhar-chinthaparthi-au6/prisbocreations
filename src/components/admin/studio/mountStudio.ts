// Port of the Prisbo Creations admin prototype. DOM is built the same way; saves go to the studio API.
import { composePrint, normalizeKind, type DesignKind } from "@/lib/studio/composePrint";
import { loopsOf, normalizeShape, presetShape, shapeBounds, SHAPE_LABELS, type PrintShape } from "@/lib/studio/printShape";
import { attachShapeEditor } from "./shapeEditor";
import { uploadAdminImageWithProgress } from "@/lib/api/upload-progress";

export function mountStudio(root: HTMLElement, db: StudioDb, initialView = "products") {
  const $ = (s: string, e: ParentNode = root) => e.querySelector(s) as HTMLElement | null;
  const uid = () => Math.random().toString(36).slice(2, 9);
  const slug = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const esc = (s: unknown) =>
    String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] || c);

  db.cats = db.cats || [];
  db.prods = db.prods || [];
  db.recs = db.recs || { orders: [], inquiries: [], reviews: [], users: [] };
  db.notes = db.notes || [];
  db.known = db.known || { cats: [], subs: [], orders: [], inquiries: [], reviews: [], users: [], notes: [] };
  db.store = db.store || {
    name: "Prisbo Creations",
    banner: "",
    open: true,
    hero: {
      eyebrow: "Made to feel like yours",
      l1: "Little details.",
      l2: "Big meaning.",
      sub: "Custom apparel and thoughtful gifts that turn everyday things into something personal.",
      cta: "Explore the collection",
      link: "Get to know us",
    },
    recipients: [],
    occasions: [],
  };
  for (const key of ["orders", "inquiries", "reviews", "users"] as const) {
    db.recs[key] = db.recs[key] || [];
  }

  let stopShapeEdit = () => {};

  root.innerHTML =
    '<aside class="sb"><div class="br">Prisbo Creations<small>Admin</small></div><nav id="nav"></nav></aside><main id="main"></main><div id="toast"></div>';

  let tt = 0;
  const toast = (m: string) => {
    const t = $("#toast");
    if (!t) return;
    t.textContent = m;
    t.classList.add("on");
    window.clearTimeout(tt);
    tt = window.setTimeout(() => t.classList.remove("on"), 2200);
  };
  const note = (msg: string) => db.notes.unshift({ id: uid(), msg, at: Date.now(), read: false });
  async function save() {
    try {
      const res = await fetch("/api/v1/admin/studio", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(db),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        toast(j.error || "Could not save");
        return false;
      }
      db.cats = j.data.cats;
      db.prods = j.data.prods;
      db.notes = j.data.notes;
      db.store = j.data.store;
      db.recs = j.data.recs;
      db.known = j.data.known;
      return true;
    } catch {
      toast("Could not save");
      return false;
    }
  }

  const NAV = [
    ["products", "Products"],
    ["storefront", "Storefront"],
    ["categories", "Categories"],
    ["orders", "Orders"],
    ["inquiries", "Bulk Inquiries"],
    ["reviews", "Reviews"],
    ["notifications", "Notifications"],
    ["users", "Users"],
  ];
  const DEFAULT_REC = ["him", "her", "kids", "couples", "Corporate"];
  const DEFAULT_OCC = ["Birthday", "Wedding", "Anniversary", "Festive", "Baby"];
  const namesOf = (saved: string[] | undefined, fallback: string[], extra: string[]) => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const item of [...(saved?.length ? saved : fallback), ...extra]) {
      const name = String(item || "").trim();
      const key = name.toLowerCase();
      if (!name || seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
    return out;
  };
  db.store.recipients = namesOf(
    db.store.recipients,
    DEFAULT_REC,
    db.prods.flatMap((p) => p.rec || []),
  );
  db.store.occasions = namesOf(
    db.store.occasions,
    DEFAULT_OCC,
    db.prods.flatMap((p) => p.occ || []),
  );
  const SZ = ["XS", "S", "M", "L", "XL", "XXL", "One size"];
  const ENH = "brightness(1.06) contrast(1.08) saturate(1.2)";
  const PAL = [
    ["Black", "#1F1B18"],
    ["White", "#FFFFFF"],
    ["Cream", "#F3EADB"],
    ["Beige", "#D8C3A5"],
    ["Grey", "#9A9A9A"],
    ["Navy", "#1F2A44"],
    ["Blue", "#3F6FB5"],
    ["Sky", "#A9C8E8"],
    ["Green", "#4C7A57"],
    ["Olive", "#7D7A3C"],
    ["Yellow", "#E5B93C"],
    ["Orange", "#D9822B"],
    ["Terracotta", "#BE6C3B"],
    ["Red", "#B3303A"],
    ["Maroon", "#6E1F2E"],
    ["Pink", "#E8A6B8"],
    ["Purple", "#7B5BA6"],
    ["Brown", "#6B4A35"],
  ];
  let view = initialView;
  let arg: string | null = null;
  let armed: string | null = null;
  const go = (v: string, a?: string) => {
    view = v;
    arg = a || null;
    render();
  };
  const hd = (e: string, t: string, a = "") =>
    `<div class="tt"><div><div class="eb"><i></i>${e}</div><h1>${t}</h1></div><div>${a}</div></div>`;

  const readImg = (f: File, max = 900) =>
    new Promise<string>((ok, no) => {
      const r = new FileReader();
      r.onload = () => {
        const i = new Image();
        i.onload = () => {
          const k = Math.min(1, max / Math.max(i.width, i.height));
          const c = document.createElement("canvas");
          c.width = Math.max(1, Math.round(i.width * k));
          c.height = Math.max(1, Math.round(i.height * k));
          c.getContext("2d")?.drawImage(i, 0, 0, c.width, c.height);
          c.toBlob(async (blob) => {
            try {
              if (!blob) return no(new Error("resize"));
              const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
              ok(await uploadAdminImageWithProgress(file, () => {}));
            } catch (err) {
              no(err);
            }
          }, "image/jpeg", 0.82);
        };
        i.onerror = () => no(new Error("image"));
        i.src = String(r.result);
      };
      r.onerror = () => no(new Error("read"));
      r.readAsDataURL(f);
    });

  function dropzone(el: HTMLElement, cb: (files: File[]) => void, multi?: boolean) {
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/jpeg,image/png,image/webp";
    i.multiple = !!multi;
    const ok = (f: FileList | null) => [...(f || [])].filter((x) => /^image\/(jpeg|png|webp)$/.test(x.type));
    el.onclick = () => i.click();
    i.onchange = () => {
      cb(ok(i.files));
      i.value = "";
    };
    el.ondragover = (e) => {
      e.preventDefault();
      el.classList.add("ov");
    };
    el.ondragleave = () => el.classList.remove("ov");
    el.ondrop = (e) => {
      e.preventDefault();
      el.classList.remove("ov");
      cb(ok(e.dataTransfer?.files || null));
    };
  }
  const UPTXT = () => `<div>Click to upload or drag and drop<small>JPG, PNG or WebP, resized for you</small></div>`;
  const catName = (id: string) => {
    for (const c of db.cats) {
      if (c.id == id) return c.name;
      for (const s of c.subs || []) if (s.id == id) return c.name + " › " + s.name;
    }
    return "";
  };
  const combos = (p: StudioProduct) => {
    const C = p.colours.length ? p.colours : [null];
    const S = p.sizes.length ? p.sizes : [null];
    return p.colours.length || p.sizes.length
      ? C.flatMap((c) => S.map((s) => ({ c, s, k: (c ? c.id : "-") + "|" + (s || "-") })))
      : [];
  };
  const total = (p: StudioProduct) => {
    const cb = combos(p);
    return cb.length ? cb.reduce((a, x) => a + (+p.vs[x.k] || 0), 0) : +p.stock || 0;
  };

  function render() {
    const un = db.notes.filter((n) => !n.read).length;
    const nav = $("#nav");
    const main = $("#main");
    if (!nav || !main) return;
    nav.innerHTML = NAV.map(
      ([k, n]) =>
        `<a data-go="${k}" class="${view == k || (view == "edit" && k == "products") ? "on" : ""}">${n}${k == "notifications" && un ? `<b>${un}</b>` : ""}</a>`,
    ).join("");
    ({ products: Products, edit: Editor, categories: Cats, storefront: Store, notifications: Notes }[view] || Recs)(main);
    window.scrollTo(0, 0);
  }

  const onClick = (e: Event) => {
    const g = (e.target as HTMLElement | null)?.closest?.("[data-go]") as HTMLElement | null;
    if (g) go(g.dataset.go || "products", g.dataset.id);
  };
  root.addEventListener("click", onClick);

  function Products(m: HTMLElement) {
    const f = { q: "", st: "all", rec: "", cat: "" };
    m.innerHTML =
      hd("Catalogue", "Your <em>products.</em>", '<button class="btn" id="csv">Export CSV</button><button class="btn p" data-go="edit">Add product</button>') +
      `<div class="cd"><div class="r2"><input class="in" id="q" placeholder="Search name, brand or SKU" style="margin:0"><select class="in" id="fc" style="margin:0"></select></div><div class="ch" id="fs"></div><div class="ch" id="fr"></div></div><div id="ls"></div>`;
    const fc = $("#fc") as HTMLSelectElement | null;
    if (fc) {
      fc.innerHTML =
        '<option value="">All categories</option>' +
        db.cats
          .flatMap((c) => [
            `<option value="${c.id}">${esc(c.name)}</option>`,
            ...(c.subs || []).map((s) => `<option value="${s.id}">${esc(c.name)} › ${esc(s.name)}</option>`),
          ])
          .join("");
    }
    const inCat = (p: StudioProduct) =>
      !f.cat || p.cat == f.cat || ((db.cats.find((c) => c.id == f.cat) || { subs: [] }).subs || []).some((s) => s.id == p.cat);
    const list = () =>
      db.prods.filter(
        (p) =>
          (f.st == "all" || (f.st == "low" ? total(p) < 5 && p.status != "archived" : p.status == f.st)) &&
          (!f.rec || (p.rec || []).includes(f.rec)) &&
          inCat(p) &&
          `${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(f.q),
      );
    const draw = () => {
      const fs = $("#fs");
      const fr = $("#fr");
      const ls = $("#ls");
      if (!fs || !fr || !ls) return;
      fs.innerHTML = [
        ["all", "All"],
        ["published", "Published"],
        ["draft", "Draft"],
        ["archived", "Archived"],
        ["low", "Low stock (&lt;5)"],
      ]
        .map(([k, n]) => `<span class="c ${f.st == k ? "on" : ""}" data-s="${k}">${n}</span>`)
        .join("");
      fr.innerHTML = '<span class="sub">Recipient</span>' + db.store.recipients.map((r) => `<span class="c ${f.rec == r ? "on" : ""}" data-r="${esc(r)}">${esc(r)}</span>`).join("");
      const l = list();
      ls.innerHTML = l.length
        ? `<div class="pl">${l
            .map(
              (p) =>
                `<div class="pc" data-go="edit" data-id="${p.id}">${p.imgs?.[0] ? `<img src="${p.imgs[0].src}" style="${p.imgs[0].enh ? "filter:" + ENH : ""}">` : '<div class="np">No photo</div>'}<div><b>${esc(p.name) || "Untitled"}</b><br><span>${p.price !== "" ? "₹" + p.price : "No price"} · ${total(p)} in stock</span>${p.colours?.length ? `<div class="dots">${p.colours.map((c) => `<i class="dot" style="background:${c.hex}" title="${esc(c.n)}"></i>`).join("")}</div>` : "<br>"}<span class="pill ${p.status}">${p.status}</span></div></div>`,
            )
            .join("")}</div>`
        : db.prods.length
          ? '<div class="em">No products match these filters.</div>'
          : '<div class="em"><b>No products yet</b>Add your first product to see it here.<br><button class="btn p" data-go="edit">Add product</button></div>';
      fs.querySelectorAll("[data-s]").forEach((c) => {
        (c as HTMLElement).onclick = () => {
          f.st = (c as HTMLElement).dataset.s || "all";
          draw();
        };
      });
      fr.querySelectorAll("[data-r]").forEach((c) => {
        (c as HTMLElement).onclick = () => {
          const r = (c as HTMLElement).dataset.r || "";
          f.rec = f.rec == r ? "" : r;
          draw();
        };
      });
    };
    const q = $("#q") as HTMLInputElement | null;
    if (q) q.oninput = (e) => {
      f.q = (e.target as HTMLInputElement).value.toLowerCase();
      draw();
    };
    if (fc) fc.onchange = (e) => {
      f.cat = (e.target as HTMLSelectElement).value;
      draw();
    };
    draw();
    const csv = $("#csv");
    if (csv)
      csv.onclick = () => {
        const quote = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
        const t = ["SKU,Name,Category,Status,Price,Stock,Colours,Sizes"]
          .concat(
            list().map((p) =>
              [p.sku, p.name, catName(p.cat), p.status, p.price, total(p), (p.colours || []).map((c) => c.n).join("|"), (p.sizes || []).join("|")]
                .map(quote)
                .join(","),
            ),
          )
          .join("\n");
        const a = document.createElement("a");
        a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(t);
        a.download = "products.csv";
        a.click();
        navigator.clipboard?.writeText(t).then(
          () => toast("CSV copied to clipboard"),
          () => toast("CSV export started"),
        );
      };
  }

  function Editor(m: HTMLElement) {
    const ex = db.prods.find((x) => x.id == arg);
    const p: StudioProduct = ex
      ? JSON.parse(JSON.stringify(ex))
      : {
          id: uid(),
          status: "draft",
          cat: "",
          rec: [],
          occ: [],
          name: "",
          price: "",
          compare: "",
          stock: "",
          sku: "",
          brand: "",
          slug: "",
          imgs: [],
          colours: [],
          sizes: [],
          vs: {},
          desc: "",
          specs: [],
          mfr: "",
          country: "",
          pers: { text: false, label: "Name or message", max: 30, photo: false, note: false, fee: "" },
        };
    p.imgs = p.imgs || [];
    p.colours = p.colours || [];
    p.sizes = p.sizes || [];
    p.vs = p.vs || {};
    p.rec = p.rec || [];
    p.occ = p.occ || [];
    p.specs = p.specs || [];
    p.pers = p.pers || { text: false, label: "Name or message", max: 30, photo: false, note: false, fee: "" };
    m.innerHTML =
      hd("Catalogue", ex ? "Edit <em>product.</em>" : "Add a <em>new product.</em>") +
      `<div class="ed"><div class="col">
 <div class="cd"><h4>Basics</h4><label>Name<input class="in" data-k="name"></label><label>Description<textarea class="in" data-k="desc" placeholder="What makes it special? Mention material, size and who it is for."></textarea></label><div class="r2"><label>Price (₹)<input class="in" type="number" min="0" data-k="price"></label><label>Original price (optional)<input class="in" type="number" min="0" data-k="compare" placeholder="Shown struck through"></label></div></div>
 <div class="cd"><h4>Photos</h4><p class="sub" id="ph-h"></p><div class="up" id="dz">${UPTXT()}</div><div class="ph" id="ph"></div><div id="print-studio"></div></div>
 <div class="cd"><h4>Where it belongs</h4><label>Category<select class="in" id="cat"></select></label><div id="newcatbox" hidden><label>Category name<input class="in" id="newcat" placeholder="e.g. Mugs"></label><label>Category photo</label><div class="up" id="cat-up"></div><button class="btn p na" id="addcat" type="button">Add category</button></div><label>Subcategory<select class="in" id="sub"></select></label><div id="newsubbox" hidden><label>Subcategory name<input class="in" id="newsub" placeholder="e.g. Travel mugs"></label><label>Subcategory photo</label><div class="up" id="sub-up"></div><button class="btn p na" id="addsub" type="button">Add subcategory</button></div><label>Recipient</label><div class="ch" id="rec" style="margin-top:6px"></div><label>Occasion</label><div class="ch" id="occ" style="margin-top:6px"></div></div>
 <div class="cd"><h4>Colours</h4><p class="sub">Tap a colour to add it, or pick your own. Link each colour to a photo so shoppers see the right one.</p><div class="pal" id="pal"></div><div id="cl"></div></div>
 <div class="cd"><h4>Sizes</h4><div class="ch" id="sz" style="margin-top:6px"></div></div>
 <div class="cd"><h4>Stock</h4><div id="stk"></div></div>
 <div class="cd"><h4>Personalisation</h4><p class="sub">What can the customer add before ordering?</p><label class="tg"><input type="checkbox" id="pt"> A name or message</label><div id="ptx" class="r2" style="display:none"><label>Field label<input class="in" id="pl"></label><label>Max characters<input class="in" id="pm" type="number" min="1"></label></div><label class="tg"><input type="checkbox" id="pp"> A photo upload</label><label class="tg"><input type="checkbox" id="pn"> A gift note</label><label style="max-width:240px">Extra charge for personalising (₹)<input class="in" type="number" min="0" id="pf" placeholder="0"></label></div>
 <div class="cd"><details><summary>More details</summary><div class="r2" style="margin-top:14px"><label>SKU<input class="in" data-k="sku" placeholder="Auto if empty"></label><label>Brand<input class="in" data-k="brand"></label></div><label>Web address ending<input class="in" data-k="slug" placeholder="Auto from name"></label><div class="r2"><label>Made by<input class="in" data-k="mfr"></label><label>Country of origin<input class="in" data-k="country"></label></div><label>Specs</label><div id="sp"></div><button class="btn" id="addsp">Add spec</button></details></div>
 </div><aside class="sum"><div class="cd" id="sm"></div></aside></div>`;
    const bind = (r: ParentNode) =>
      r.querySelectorAll("[data-k]").forEach((node) => {
        const i = node as HTMLInputElement;
        i.value = String(p[i.dataset.k as keyof StudioProduct] ?? "");
        i.oninput = () => {
          (p as unknown as Record<string, string>)[i.dataset.k || ""] = i.value;
          sum();
        };
      });
    bind(m);
    const cat = $("#cat") as HTMLSelectElement | null;
    const sub = $("#sub") as HTMLSelectElement | null;
    const newCatBox = $("#newcatbox");
    const newSubBox = $("#newsubbox");
    let newCatImg = "";
    let newSubImg = "";
    const placeOf = (id: string) => {
      const direct = db.cats.find((c) => c.id == id);
      if (direct) return { cat: direct, sub: "" };
      for (const row of db.cats) {
        if ((row.subs || []).some((s) => s.id == id)) return { cat: row, sub: id };
      }
      return { cat: null as StudioCat | null, sub: "" };
    };
    const paintUp = (id: string, url: string) => {
      const zone = $("#" + id);
      if (!zone) return;
      zone.classList.remove("busy");
      zone.innerHTML = url ? `<img src="${url}">` : UPTXT();
    };
    const bindUp = (id: string, set: (url: string) => void) => {
      const zone = $("#" + id);
      if (!zone) return;
      dropzone(zone, (fs) => {
        const file = fs[0];
        if (!file) return;
        void (async () => {
          let cropped: File;
          try {
            cropped = await adjustCrop(file);
          } catch {
            return;
          }
          zone.classList.add("busy");
          zone.innerHTML = '<i class="spin"></i><div>Uploading…</div>';
          try {
            set(await readImg(cropped, 800));
          } catch {
            toast("Could not upload that photo");
          }
          paintUp(id, id == "cat-up" ? newCatImg : newSubImg);
        })();
      });
    };
    const fillPlace = () => {
      if (!cat || !sub) return;
      const loc = placeOf(p.cat);
      const catId = loc.cat?.id || "";
      cat.innerHTML =
        '<option value="">Select…</option>' +
        db.cats.map((c) => `<option value="${c.id}" ${c.id == catId ? "selected" : ""}>${esc(c.name)}</option>`).join("") +
        '<option value="__new__">New category</option>';
      const subs = loc.cat?.subs || [];
      sub.innerHTML =
        `<option value="">${catId ? "Select…" : "Choose a category first"}</option>` +
        subs.map((s) => `<option value="${s.id}" ${s.id == loc.sub ? "selected" : ""}>${esc(s.name)}</option>`).join("") +
        (catId ? '<option value="__new__">New subcategory</option>' : "");
      sub.disabled = !catId;
      if (newCatBox) newCatBox.hidden = true;
      if (newSubBox) newSubBox.hidden = true;
    };
    fillPlace();
    paintUp("cat-up", "");
    paintUp("sub-up", "");
    bindUp("cat-up", (url) => {
      newCatImg = url;
    });
    bindUp("sub-up", (url) => {
      newSubImg = url;
    });
    if (cat)
      cat.onchange = () => {
        if (cat.value == "__new__") {
          if (newCatBox) newCatBox.hidden = false;
          if (newSubBox) newSubBox.hidden = true;
          sub.innerHTML = '<option value="">Add the category first</option>';
          sub.disabled = true;
          return;
        }
        if (newCatBox) newCatBox.hidden = true;
        p.cat = cat.value;
        fillPlace();
        sum();
      };
    if (sub)
      sub.onchange = () => {
        if (sub.value == "__new__") {
          if (!placeOf(p.cat).cat) {
            toast("Choose a category first");
            sub.value = "";
            return;
          }
          if (newSubBox) newSubBox.hidden = false;
          return;
        }
        if (newSubBox) newSubBox.hidden = true;
        const parent = placeOf(p.cat).cat;
        p.cat = sub.value || parent?.id || "";
        sum();
      };
    const addCatBtn = $("#addcat") as HTMLButtonElement | null;
    const addSubBtn = $("#addsub") as HTMLButtonElement | null;
    if (addCatBtn)
      addCatBtn.onclick = async () => {
        const input = $("#newcat") as HTMLInputElement | null;
        const name = input?.value.trim() || "";
        if (!name) return toast("Add a category name");
        if (!newCatImg) return toast("Add a photo for this category");
        if (addCatBtn.disabled) return;
        const row = { id: uid(), name, slug: slug(name), img: newCatImg, subs: [] as StudioSub[] };
        db.cats.push(row);
        const prev = p.cat;
        p.cat = row.id;
        addCatBtn.disabled = true;
        addCatBtn.textContent = "Saving…";
        if (!(await save())) {
          db.cats = db.cats.filter((c) => c.id != row.id);
          p.cat = prev;
          addCatBtn.disabled = false;
          addCatBtn.textContent = "Add category";
          return;
        }
        if (input) input.value = "";
        newCatImg = "";
        paintUp("cat-up", "");
        addCatBtn.disabled = false;
        addCatBtn.textContent = "Add category";
        fillPlace();
        sum();
        toast("Category added");
      };
    if (addSubBtn)
      addSubBtn.onclick = async () => {
        const input = $("#newsub") as HTMLInputElement | null;
        const name = input?.value.trim() || "";
        const parent = placeOf(p.cat).cat;
        if (!parent) return toast("Choose a category first");
        if (!name) return toast("Add a subcategory name");
        if (!newSubImg) return toast("Add a photo for this subcategory");
        if (addSubBtn.disabled) return;
        parent.subs = parent.subs || [];
        const row = { id: uid(), name, slug: slug(name), img: newSubImg };
        parent.subs.push(row);
        const prev = p.cat;
        p.cat = row.id;
        addSubBtn.disabled = true;
        addSubBtn.textContent = "Saving…";
        if (!(await save())) {
          parent.subs = parent.subs.filter((s) => s.id != row.id);
          p.cat = prev;
          addSubBtn.disabled = false;
          addSubBtn.textContent = "Add subcategory";
          return;
        }
        if (input) input.value = "";
        newSubImg = "";
        paintUp("sub-up", "");
        addSubBtn.disabled = false;
        addSubBtn.textContent = "Add subcategory";
        fillPlace();
        sum();
        toast("Subcategory added");
      };
    const chips = (id: string, key: "rec" | "occ", listKey: "recipients" | "occasions") => {
      const h = $("#" + id);
      if (!h) return;
      const arr = db.store[listKey];
      h.innerHTML =
        arr.map((r) => `<span class="c ${p[key].some((x) => x.toLowerCase() == r.toLowerCase()) ? "on" : ""}" data-r="${esc(r)}">${esc(r)}</span>`).join("") +
        '<input placeholder="Add another, press Enter">';
      h.querySelectorAll("[data-r]").forEach((c) => {
        (c as HTMLElement).onclick = () => {
          const r = (c as HTMLElement).dataset.r || "";
          const on = p[key].some((x) => x.toLowerCase() == r.toLowerCase());
          p[key] = on ? p[key].filter((x) => x.toLowerCase() != r.toLowerCase()) : [...p[key], r];
          chips(id, key, listKey);
        };
      });
      const input = h.querySelector("input") as HTMLInputElement | null;
      if (!input) return;
      input.onkeydown = async (e) => {
        if (e.key != "Enter") return;
        const name = input.value.trim();
        if (!name) return;
        e.preventDefault();
        const exists = arr.some((x) => x.toLowerCase() == name.toLowerCase());
        if (!exists) arr.push(name);
        if (!p[key].some((x) => x.toLowerCase() == name.toLowerCase())) p[key] = [...p[key], name];
        input.disabled = true;
        input.placeholder = "Saving…";
        if (!(await save())) {
          if (!exists) arr.pop();
          p[key] = p[key].filter((x) => x.toLowerCase() != name.toLowerCase());
          chips(id, key, listKey);
          return;
        }
        chips(id, key, listKey);
      };
    };
    chips("rec", "rec", "recipients");
    chips("occ", "occ", "occasions");
    const stock = () => {
      const cb = combos(p);
      const stk = $("#stk");
      if (!stk) return;
      stk.innerHTML = cb.length
        ? `<p class="sub">Set stock for each option.</p><table class="vt"><tr><th>Option</th><th>In stock</th></tr>${cb
            .map(
              (x) =>
                `<tr><td>${x.c ? `<i class="dot" style="background:${x.c.hex}"></i>${esc(x.c.n)}` : ""} ${x.s ? esc(x.s) : ""}</td><td><input class="in" type="number" min="0" data-v="${x.k}" value="${p.vs[x.k] ?? ""}"></td></tr>`,
            )
            .join("")}</table>`
        : '<label>Units in stock<input class="in" type="number" min="0" data-k="stock" style="max-width:200px"></label>';
      bind(stk);
      stk.querySelectorAll("[data-v]").forEach((node) => {
        const i = node as HTMLInputElement;
        i.oninput = () => {
          p.vs[i.dataset.v || ""] = i.value;
          sum();
        };
      });
    };
    const cols = () => {
      const pal = $("#pal");
      if (!pal) return;
      pal.innerHTML =
        PAL.map(([n, h]) => `<button class="sw ${p.colours.some((c) => c.hex == h) ? "on" : ""}" style="background:${h}" title="${n}" data-pn="${n}"></button>`).join("") +
        '<input type="color" id="cu" value="#BE6C3B" title="Pick your own" style="width:30px;height:30px;padding:0;border:0;background:none">';
      pal.querySelectorAll("[data-pn]").forEach((b) => {
        (b as HTMLElement).onclick = () => {
          const found = PAL.find((x) => x[0] == (b as HTMLElement).dataset.pn);
          if (!found) return;
          const [n, h] = found;
          const i = p.colours.findIndex((c) => c.hex == h);
          if (i > -1) p.colours.splice(i, 1);
          else p.colours.push({ id: uid(), n, hex: h, img: "" });
          cols();
          stock();
          sum();
        };
      });
      const cu = $("#cu") as HTMLInputElement | null;
      if (cu)
        cu.onchange = (e) => {
          p.colours.push({ id: uid(), n: "Custom colour", hex: (e.target as HTMLInputElement).value, img: "" });
          cols();
          stock();
          sum();
        };
      const L = $("#cl");
      if (!L) return;
      L.innerHTML = p.colours
        .map(
          (c, i) =>
            `<div class="cc"><input type="color" value="${c.hex}" data-ch="${i}"><input class="in" value="${esc(c.n)}" data-cn="${i}" placeholder="Colour name"><select class="in" data-ci="${i}"><option value="">No photo</option>${p.imgs
              .map((g, j) => `<option value="${j}" ${c.img === j ? "selected" : ""}>Photo ${j + 1}</option>`)
              .join("")}</select><button class="x" data-cx="${i}">×</button></div>`,
        )
        .join("");
      L.querySelectorAll("[data-ch]").forEach((n) => {
        (n as HTMLInputElement).onchange = () => {
          const colour = p.colours[+(n as HTMLElement).dataset.ch!];
          if (colour) colour.hex = (n as HTMLInputElement).value;
          cols();
          stock();
        };
      });
      L.querySelectorAll("[data-cn]").forEach((n) => {
        (n as HTMLInputElement).oninput = () => {
          const colour = p.colours[+(n as HTMLElement).dataset.cn!];
          if (colour) colour.n = (n as HTMLInputElement).value;
        };
        (n as HTMLInputElement).onchange = () => stock();
      });
      L.querySelectorAll("[data-ci]").forEach((n) => {
        (n as HTMLSelectElement).onchange = () => {
          const colour = p.colours[+(n as HTMLElement).dataset.ci!];
          if (colour) colour.img = (n as HTMLSelectElement).value === "" ? "" : +(n as HTMLSelectElement).value;
        };
      });
      L.querySelectorAll("[data-cx]").forEach((b) => {
        (b as HTMLElement).onclick = () => {
          p.colours.splice(+(b as HTMLElement).dataset.cx!, 1);
          cols();
          stock();
          sum();
        };
      });
    };
    const szs = () => {
      const h = $("#sz");
      if (!h) return;
      const all = [...new Set([...SZ, ...p.sizes])];
      h.innerHTML = all.map((s) => `<span class="c ${p.sizes.includes(s) ? "on" : ""}" data-z="${esc(s)}">${esc(s)}</span>`).join("") + '<input placeholder="Add your own, press Enter">';
      h.querySelectorAll("[data-z]").forEach((c) => {
        (c as HTMLElement).onclick = () => {
          const s = (c as HTMLElement).dataset.z || "";
          p.sizes = p.sizes.includes(s) ? p.sizes.filter((x) => x != s) : [...p.sizes, s];
          szs();
          stock();
        };
      });
      const n = h.querySelector("input") as HTMLInputElement | null;
      if (n)
        n.onkeydown = (e) => {
          if (e.key == "Enter" && n.value.trim()) {
            e.preventDefault();
            const s = n.value.trim();
            if (!p.sizes.includes(s)) p.sizes.push(s);
            szs();
            stock();
          }
        };
    };
    const specs = () => {
      const s = $("#sp");
      if (!s) return;
      s.innerHTML = p.specs
        .map(
          (r, i) =>
            `<div class="r3"><input class="in" data-a="${i}" value="${esc(r[0])}" placeholder="e.g. Material"><input class="in" data-b="${i}" value="${esc(r[1])}" placeholder="e.g. 100% cotton"><button class="x" data-d="${i}">×</button></div>`,
        )
        .join("");
      s.querySelectorAll("input").forEach((node) => {
        const n = node as HTMLInputElement;
        n.oninput = () => {
          if (n.dataset.a != null) p.specs[+n.dataset.a][0] = n.value;
          else if (n.dataset.b != null) p.specs[+n.dataset.b][1] = n.value;
        };
      });
      s.querySelectorAll("[data-d]").forEach((b) => {
        (b as HTMLElement).onclick = () => {
          p.specs.splice(+(b as HTMLElement).dataset.d!, 1);
          specs();
        };
      });
    };
    const addsp = $("#addsp");
    if (addsp) addsp.onclick = () => {
      p.specs.push(["", ""]);
      specs();
    };
    const P = p.pers;
    const pt = $("#pt") as HTMLInputElement | null;
    const pp = $("#pp") as HTMLInputElement | null;
    const pn = $("#pn") as HTMLInputElement | null;
    const pl = $("#pl") as HTMLInputElement | null;
    const pm = $("#pm") as HTMLInputElement | null;
    const pf = $("#pf") as HTMLInputElement | null;
    if (pt) pt.checked = P.text;
    if (pp) pp.checked = P.photo;
    if (pn) pn.checked = P.note;
    if (pl) pl.value = String(P.label ?? "");
    if (pm) pm.value = String(P.max ?? "");
    if (pf) pf.value = String(P.fee ?? "");
    const pv = () => {
      const box = $("#ptx");
      if (box) box.style.display = P.text ? "grid" : "none";
    };
    pv();
    if (pt) pt.onchange = (e) => {
      P.text = (e.target as HTMLInputElement).checked;
      pv();
    };
    if (pp) pp.onchange = (e) => {
      P.photo = (e.target as HTMLInputElement).checked;
    };
    if (pn) pn.onchange = (e) => {
      P.note = (e.target as HTMLInputElement).checked;
    };
    if (pl) pl.oninput = (e) => {
      P.label = (e.target as HTMLInputElement).value;
    };
    if (pm) pm.oninput = (e) => {
      P.max = (e.target as HTMLInputElement).value;
    };
    if (pf) pf.oninput = (e) => {
      P.fee = (e.target as HTMLInputElement).value;
    };
    const photos = () => {
      const h = $("#ph");
      const phh = $("#ph-h");
      if (!h) return;
      h.innerHTML = p.imgs
        .map(
          (g, i) =>
            `<div><div class="cmp"><img src="${g.src}"><img class="en" src="${g.src}" style="filter:${ENH};clip-path:inset(0 0 0 100%)"><i class="hd" style="left:100%"></i><span class="tag">Original</span><span class="tag r">Enhanced</span></div><div class="pa"><label><input type="checkbox" data-e="${i}" ${g.enh ? "checked" : ""}> Use enhanced</label>${i ? `<button data-c="${i}">Make cover</button>` : "<b>Cover</b>"}<button data-rm="${i}">Remove</button></div></div>`,
        )
        .join("");
      if (phh) phh.textContent = p.imgs.length ? "Drag across a photo to compare original and enhanced." : "Up to 8 photos. The first is the cover.";
      h.querySelectorAll(".cmp").forEach((node) => {
        const c = node as HTMLElement;
        const en = c.querySelector(".en") as HTMLElement | null;
        const hh = c.querySelector(".hd") as HTMLElement | null;
        if (!en || !hh) return;
        const set = (v: number) => {
          v = Math.max(0, Math.min(100, v));
          en.style.clipPath = `inset(0 0 0 ${v}%)`;
          hh.style.left = v + "%";
        };
        const mv = (e: PointerEvent) => {
          const r = c.getBoundingClientRect();
          set(((e.clientX - r.left) / r.width) * 100);
        };
        en.style.transition = hh.style.transition = "clip-path .9s ease,left .9s ease";
        requestAnimationFrame(() => requestAnimationFrame(() => set(50)));
        c.onpointerdown = (e) => {
          en.style.transition = hh.style.transition = "none";
          c.setPointerCapture(e.pointerId);
          mv(e);
        };
        c.onpointermove = (e) => {
          if (c.hasPointerCapture(e.pointerId)) mv(e);
        };
      });
      h.querySelectorAll("[data-e]").forEach((c) => {
        (c as HTMLInputElement).onchange = () => {
          const img = p.imgs[+(c as HTMLElement).dataset.e!];
          if (img) img.enh = (c as HTMLInputElement).checked;
          sum();
        };
      });
      h.querySelectorAll("[data-c]").forEach((b) => {
        (b as HTMLElement).onclick = () => {
          const i = +(b as HTMLElement).dataset.c!;
          p.colours.forEach((c) => {
            c.img = c.img === "" ? "" : c.img === i ? 0 : c.img < i ? Number(c.img) + 1 : c.img;
          });
          p.imgs.unshift(p.imgs.splice(i, 1)[0]);
          if (p.print) {
            if (p.print.photo === i) p.print.photo = 0;
            else if (p.print.photo < i) p.print.photo += 1;
          }
          photos();
          sum();
        };
      });
      h.querySelectorAll("[data-rm]").forEach((b) => {
        (b as HTMLElement).onclick = () => {
          const i = +(b as HTMLElement).dataset.rm!;
          p.imgs.splice(i, 1);
          if (p.print) {
            if (p.print.photo === i) p.print = { ...p.print, on: false, photo: 0 };
            else if (p.print.photo > i) p.print.photo -= 1;
          }
          p.colours.forEach((c) => {
            c.img = c.img === i ? "" : Number(c.img) > i ? Number(c.img) - 1 : c.img;
          });
          photos();
          sum();
        };
      });
      cols();
      printStudio();
    };
    let samplePic = "";
    const loopPics: string[] = [];
    const printStudio = () => {
      stopShapeEdit();
      const box = $("#print-studio");
      if (!box) return;
      if (!p.imgs.length) {
        box.innerHTML = "";
        return;
      }
      if (!p.print) {
        p.print = { on: false, photo: 0, zone: { x: 0.3, y: 0.36, w: 0.4, h: 0.26 }, shape: presetShape("rect", { x: 0.3, y: 0.36, w: 0.4, h: 0.26 }), kind: "both", sample: "" };
      }
      const print = p.print;
      if (!print.shape) print.shape = normalizeShape(print.zone);
      print.photo = Math.min(print.photo, p.imgs.length - 1);
      const kind = normalizeKind(print.kind);
      let shape = normalizeShape(print.shape);
      let activeLoop = 0;
      if (shape.loops?.length === 1 && !shape.loops[0]!.sample) {
        shape.loops[0]!.fill = kind;
        shape.loops[0]!.sample = print.sample || "";
      }
      print.shape = shape;
      print.zone = shapeBounds(shape);
      box.innerHTML = `<div style="margin-top:18px;border-top:1px solid var(--line);padding-top:16px">
        <h4>Print area</h4>
        <p class="sub">Pull the points into any shape. The small dots curve a corner, and the dark dot rotates the whole outline.</p>
        <label class="tg"><input type="checkbox" id="print-on" ${print.on ? "checked" : ""}> Buyers can preview a print on this photo</label>
        <div id="print-body" style="${print.on ? "" : "display:none"}">
          <label>Photo<select class="in" id="print-photo">${p.imgs.map((_, i) => `<option value="${i}" ${print.photo === i ? "selected" : ""}>${i === 0 ? "Cover" : "Photo " + (i + 1)}</option>`).join("")}</select></label>
          <div class="kind" id="print-shapes">${SHAPE_LABELS.map((item) => `<button type="button" data-shape="${item.kind}" class="${shape.kind === item.kind ? "on" : ""}">${item.label}</button>`).join("")}</div>
          <p class="sub" id="print-shape-note">White squares resize from every side. Round points reshape. The two small dots on the selected point curve it. The dark dot rotates.</p>
          <div class="print-frame" id="print-frame"><img class="print-photo" alt=""><canvas class="print-ink"></canvas></div>
          <p class="sub" id="print-loop-label">Inside this area</p>
          <div class="kind" id="print-kind">
            <button type="button" data-k="image" class="${kind === "image" ? "on" : ""}">Picture</button>
            <button type="button" data-k="text" class="${kind === "text" ? "on" : ""}">Text</button>
            <button type="button" data-k="both" class="${kind === "both" ? "on" : ""}">Picture and text</button>
          </div>
          <label id="print-text-field">Sample text<input class="in" id="print-sample" value="${esc(print.sample)}" placeholder="Team 2026"></label>
          <label id="print-pic-field">Sample picture<input class="in" id="print-pic" type="file" accept="image/jpeg,image/png,image/webp"></label>
        </div>
      </div>`;
      const frame = $("#print-frame");
      const img = frame?.querySelector("img.print-photo") as HTMLImageElement | null;
      const showPhoto = (src: string) => {
        if (!img || img.dataset.origin === src) return;
        img.dataset.origin = src;
        img.src = src;
      };
      showPhoto(p.imgs[print.photo]?.src || "");
      let paint = async () => {};
      let paintTimer = 0;
      const editor = frame
        ? attachShapeEditor(
            frame,
            shape,
            (next) => {
              const prevCount = shape.loops?.length ?? loopsOf(shape).length;
              shape = next;
              print.shape = next;
              print.zone = shapeBounds(next.loops?.length === 0 ? { kind: "free", points: next.points } : next);
              if ((next.loops?.length ?? 0) < prevCount) loopPics.length = next.loops?.length ?? 0;
              box.querySelectorAll("[data-shape]").forEach((el) => el.classList.toggle("on", (el as HTMLElement).dataset.shape === next.kind));
              window.clearTimeout(paintTimer);
              paintTimer = window.setTimeout(() => void paint(), 90);
            },
            (index) => {
              activeLoop = index;
              syncLoopForm();
            },
          )
        : null;
      if (editor) stopShapeEdit = editor.stop;
      const currentLoop = () => {
        const loops = shape.loops?.length ? shape.loops : loopsOf(shape);
        return loops[Math.min(activeLoop, loops.length - 1)] ?? loops[0];
      };
      const syncLoopForm = () => {
        const loop = currentLoop();
        if (!loop) return;
        print.kind = loop.fill;
        print.sample = loop.sample;
        samplePic = loopPics[activeLoop] || "";
        const label = $("#print-loop-label");
        const count = shape.loops?.length || 1;
        if (label) label.textContent = count > 1 ? `Inside loop ${activeLoop + 1} of ${count}` : "Inside this area";
        box.querySelectorAll("[data-k]").forEach((el) => el.classList.toggle("on", (el as HTMLElement).dataset.k === loop.fill));
        const sampleInput = $("#print-sample") as HTMLInputElement | null;
        if (sampleInput && sampleInput.value !== loop.sample) sampleInput.value = loop.sample;
        const text = $("#print-text-field");
        const pic = $("#print-pic-field");
        if (text) text.style.display = loop.fill === "image" ? "none" : "";
        if (pic) pic.style.display = loop.fill === "text" ? "none" : "";
      };
      const showKind = () => syncLoopForm();
      showKind();
      paint = async () => {
        const src = p.imgs[print.photo]?.src;
        const ink = frame?.querySelector(":scope > canvas.print-ink") as HTMLCanvasElement | null;
        if (!frame || !ink || !src || !print.on) return;
        showPhoto(src);
        const ctx = ink.getContext("2d");
        if (!ctx) return;
        try {
          const loops = shape.loops?.length ? shape.loops : loopsOf(shape);
          const printed = await composePrint({
            baseUrl: src,
            shape,
            placeholder: "Your design",
            text: print.sample,
            imageUrl: samplePic,
            kind: print.kind,
            mode: "after",
            inkOnly: true,
            areas: loops.map((loop, index) => ({
              points: loop.points,
              kind: loop.fill,
              text: loop.fill === "image" ? "" : loop.sample,
              imageUrl: loop.fill === "text" ? "" : loopPics[index] || "",
            })),
          });
          ink.width = printed.width;
          ink.height = printed.height;
          ctx.clearRect(0, 0, ink.width, ink.height);
          ctx.drawImage(printed, 0, 0);
        } catch {
          ctx.clearRect(0, 0, ink.width, ink.height);
        }
      };
      const on = $("#print-on") as HTMLInputElement | null;
      if (on)
        on.onchange = () => {
          print.on = on.checked;
          const body = $("#print-body");
          if (body) body.style.display = print.on ? "" : "none";
          if (print.on) void paint();
        };
      const photoSel = $("#print-photo") as HTMLSelectElement | null;
      if (photoSel)
        photoSel.onchange = () => {
          print.photo = Number(photoSel.value) || 0;
          showPhoto(p.imgs[print.photo]?.src || "");
          void paint();
        };
      box.querySelectorAll("[data-shape]").forEach((node) => {
        const button = node as HTMLButtonElement;
        button.onclick = () => {
          const nextKind = (button.dataset.shape || "rect") as PrintShape["kind"];
          const note = $("#print-shape-note");
          if (nextKind === "free") {
            editor?.startDraw();
            box.querySelectorAll("[data-shape]").forEach((el) => el.classList.toggle("on", (el as HTMLElement).dataset.shape === "free"));
            if (note) note.textContent = "Click the photo to place points. Undo removes the last point. Close loop finishes that outline, and you can close another one right after. Then choose picture, text, or both for the loop you clicked.";
            return;
          }
          shape = presetShape(nextKind, shapeBounds(shape));
          shape.loops = [{ points: shape.points, fill: print.kind, sample: print.sample }];
          print.shape = shape;
          print.zone = shapeBounds(shape);
          editor?.set(shape);
          box.querySelectorAll("[data-shape]").forEach((el) => el.classList.toggle("on", (el as HTMLElement).dataset.shape === shape.kind));
          if (note) note.textContent = "White squares resize from every side. Round points reshape. The two small dots on the selected point curve it. The dark dot rotates.";
          void paint();
        };
      });
      box.querySelectorAll("[data-k]").forEach((node) => {
        const button = node as HTMLButtonElement;
        button.onclick = () => {
          const fill = normalizeKind(button.dataset.k);
          print.kind = fill;
          if (!shape.loops?.length) shape.loops = [{ points: shape.points, fill, sample: print.sample }];
          else shape.loops[Math.min(activeLoop, shape.loops.length - 1)]!.fill = fill;
          print.shape = shape;
          showKind();
          void paint();
        };
      });
      const sample = $("#print-sample") as HTMLInputElement | null;
      if (sample)
        sample.oninput = () => {
          print.sample = sample.value;
          const loop = currentLoop();
          if (loop) loop.sample = sample.value;
          if (shape.loops?.length) print.shape = shape;
          void paint();
        };
      const pic = $("#print-pic") as HTMLInputElement | null;
      if (pic)
        pic.onchange = () => {
          const file = pic.files?.[0];
          if (!file) {
            samplePic = "";
            void paint();
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            samplePic = String(reader.result || "");
            loopPics[activeLoop] = samplePic;
            void paint();
          };
          reader.readAsDataURL(file);
        };
      if (print.on) void paint();
    };
    const dz = $("#dz");
    if (dz)
      dropzone(
        dz,
        async (fs) => {
          const batch = fs.slice(0, 8 - p.imgs.length);
          if (!batch.length) return;
          dz.classList.add("busy");
          dz.innerHTML = '<i class="spin"></i><div>Uploading…</div>';
          for (const f of batch) {
            try {
              p.imgs.push({ src: await readImg(f), enh: true });
            } catch {
              toast("Could not upload that photo");
            }
          }
          dz.classList.remove("busy");
          dz.innerHTML = UPTXT();
          photos();
          sum();
        },
        true,
      );
    const fin = async (st: string) => {
      if (!p.name.trim()) return toast("Add a name first");
      p.status = st;
      if (!p.sku) p.sku = "PC-" + uid().toUpperCase().slice(0, 5);
      if (!p.slug) p.slug = slug(p.name);
      const i = db.prods.findIndex((x) => x.id == p.id);
      if (i > -1) db.prods[i] = p;
      else db.prods.unshift(p);
      if (st == "published" && total(p) < 5) note("Low stock: " + p.name);
      if (!(await save())) return;
      toast(st == "published" ? "Published" : st == "archived" ? "Archived" : "Draft saved");
      go("products");
    };
    const sum = () => {
      const ck: [string, unknown][] = [
        ["Category", p.cat],
        ["Name", p.name.trim()],
        ["Price", p.price !== ""],
        ["One photo or more", p.imgs.length],
      ];
      const ok = ck.every((c) => c[1]);
      const g = p.imgs[0];
      const sm = $("#sm");
      if (!sm) return;
      sm.innerHTML = `<h4>Summary</h4><div class="pv">${g ? `<img src="${g.src}" style="${g.enh ? "filter:" + ENH : ""}">` : '<div class="np">No photo</div>'}<b>${esc(p.name) || "Untitled product"}</b><span>${p.price !== "" ? "₹" + esc(p.price) : "No price yet"}${p.cat ? " · " + esc(catName(p.cat)) : ""}</span>${p.colours.length ? `<div class="dots">${p.colours.map((c) => `<i class="dot" style="background:${c.hex}"></i>`).join("")}</div>` : ""}</div><ul class="ck">${ck.map((c) => `<li class="${c[1] ? "ok" : ""}">${c[0]}</li>`).join("")}</ul><button class="btn p w" id="pub" ${ok ? "" : "disabled"}>${p.status == "published" ? "Save changes" : "Publish"}</button><button class="btn w na" id="dft">Save draft</button><div style="margin-top:12px;display:flex;justify-content:space-between">${ex ? `<button class="lk" id="ar">${p.status == "archived" ? "Restore to draft" : "Archive"}</button>` : "<span></span>"}<button class="lk" data-go="products" style="color:var(--mut)">Cancel</button></div>`;
      const pub = $("#pub");
      const dft = $("#dft");
      if (pub) pub.onclick = () => void fin("published");
      if (dft) dft.onclick = () => void fin("draft");
      const ar = $("#ar");
      if (ex && ar) ar.onclick = () => void fin(p.status == "archived" ? "draft" : "archived");
    };
    szs();
    specs();
    photos();
    stock();
    sum();
  }

  function adjustCrop(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const photo = new Image();
      photo.onload = () => {
        const layer = document.createElement("div");
        layer.className = "crop-layer";
        layer.innerHTML =
          '<div class="crop-box" role="dialog" aria-label="Adjust the photo"><h3>Adjust the photo</h3><p class="sub">Drag the photo to move it. Drag the frame or its corners to crop.</p><div class="crop-stage"><img alt=""></div><label>Zoom<input type="range" min="1" max="3" step="0.01" value="1"></label><div class="ch"><span class="c on" data-a="0">Free</span><span class="c" data-a="1">Square</span><span class="c" data-a="1.333">4:3</span><span class="c" data-a="0.75">3:4</span><span class="c" data-a="1.778">16:9</span></div><div class="crop-actions"><button class="btn" type="button" data-act="cancel">Cancel</button><button class="btn p na" type="button" data-act="ok">Use this crop</button></div></div>';
        root.appendChild(layer);
        const stage = layer.querySelector(".crop-stage") as HTMLElement;
        const imgEl = layer.querySelector("img") as HTMLImageElement;
        const rect = document.createElement("div");
        rect.className = "crop-rect";
        rect.innerHTML = '<i data-h="nw"></i><i data-h="ne"></i><i data-h="sw"></i><i data-h="se"></i>';
        stage.appendChild(rect);
        imgEl.src = url;
        let zoom = 1;
        let panX = 0;
        let panY = 0;
        let aspect = 0;
        let box = { x: 24, y: 24, w: 160, h: 160 };
        const frame = () => {
          const sw = stage.clientWidth || 520;
          const sh = stage.clientHeight || 320;
          const fit = Math.min(sw / photo.naturalWidth, sh / photo.naturalHeight);
          const scale = fit * zoom;
          const dw = photo.naturalWidth * scale;
          const dh = photo.naturalHeight * scale;
          const left = (sw - dw) / 2 + panX;
          const top = (sh - dh) / 2 + panY;
          imgEl.style.width = dw + "px";
          imgEl.style.height = dh + "px";
          imgEl.style.left = left + "px";
          imgEl.style.top = top + "px";
          return { left, top, dw, dh, scale, sw, sh };
        };
        const clampBox = () => {
          const f = frame();
          box.w = Math.max(32, Math.min(box.w, f.dw));
          box.h = Math.max(32, Math.min(box.h, f.dh));
          if (aspect) box.h = box.w / aspect;
          if (box.h > f.dh) {
            box.h = f.dh;
            if (aspect) box.w = box.h * aspect;
          }
          box.x = Math.min(Math.max(box.x, f.left), f.left + f.dw - box.w);
          box.y = Math.min(Math.max(box.y, f.top), f.top + f.dh - box.h);
          rect.style.left = box.x + "px";
          rect.style.top = box.y + "px";
          rect.style.width = box.w + "px";
          rect.style.height = box.h + "px";
        };
        const fitBox = () => {
          const f = frame();
          const inset = 0.08;
          let w = f.dw * (1 - inset * 2);
          let h = f.dh * (1 - inset * 2);
          if (aspect) {
            if (w / h > aspect) w = h * aspect;
            else h = w / aspect;
          }
          box = { x: f.left + (f.dw - w) / 2, y: f.top + (f.dh - h) / 2, w, h };
          clampBox();
        };
        requestAnimationFrame(fitBox);
        const zoomInput = layer.querySelector('input[type="range"]') as HTMLInputElement;
        zoomInput.oninput = () => {
          zoom = Number(zoomInput.value) || 1;
          clampBox();
        };
        layer.querySelectorAll("[data-a]").forEach((node) => {
          (node as HTMLElement).onclick = () => {
            aspect = Number((node as HTMLElement).dataset.a) || 0;
            layer.querySelectorAll("[data-a]").forEach((n) => n.classList.toggle("on", n === node));
            fitBox();
          };
        });
        let mode: "pan" | "move" | "nw" | "ne" | "sw" | "se" | "" = "";
        let start = { x: 0, y: 0, panX: 0, panY: 0, box: { ...box } };
        stage.onpointerdown = (e) => {
          const handle = (e.target as HTMLElement).dataset.h as "nw" | "ne" | "sw" | "se" | undefined;
          mode = handle || (rect.contains(e.target as Node) ? "move" : "pan");
          start = { x: e.clientX, y: e.clientY, panX, panY, box: { ...box } };
          stage.setPointerCapture(e.pointerId);
        };
        stage.onpointermove = (e) => {
          if (!mode) return;
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          if (mode == "pan") {
            panX = start.panX + dx;
            panY = start.panY + dy;
            clampBox();
            return;
          }
          if (mode == "move") {
            box.x = start.box.x + dx;
            box.y = start.box.y + dy;
            clampBox();
            return;
          }
          let w = start.box.w;
          let h = start.box.h;
          let x = start.box.x;
          let y = start.box.y;
          if (mode == "se") {
            w = start.box.w + dx;
            h = aspect ? w / aspect : start.box.h + dy;
          } else if (mode == "sw") {
            w = start.box.w - dx;
            h = aspect ? w / aspect : start.box.h + dy;
            x = start.box.x + start.box.w - w;
          } else if (mode == "ne") {
            w = start.box.w + dx;
            h = aspect ? w / aspect : start.box.h - dy;
            y = start.box.y + start.box.h - h;
          } else {
            w = start.box.w - dx;
            h = aspect ? w / aspect : start.box.h - dy;
            x = start.box.x + start.box.w - w;
            y = start.box.y + start.box.h - h;
          }
          box = { x, y, w: Math.max(32, w), h: Math.max(32, h) };
          clampBox();
        };
        stage.onpointerup = () => {
          mode = "";
        };
        const close = (out?: File) => {
          URL.revokeObjectURL(url);
          layer.remove();
          if (out) resolve(out);
          else reject(new Error("cancel"));
        };
        layer.querySelector('[data-act="cancel"]')?.addEventListener("click", () => close());
        layer.querySelector('[data-act="ok"]')?.addEventListener("click", () => {
          const f = frame();
          const sx = Math.max(0, (box.x - f.left) / f.scale);
          const sy = Math.max(0, (box.y - f.top) / f.scale);
          const sw = Math.min(photo.naturalWidth - sx, box.w / f.scale);
          const sh = Math.min(photo.naturalHeight - sy, box.h / f.scale);
          const canvas = document.createElement("canvas");
          const limit = 1200;
          const k = Math.min(1, limit / Math.max(sw, sh));
          canvas.width = Math.max(1, Math.round(sw * k));
          canvas.height = Math.max(1, Math.round(sh * k));
          canvas.getContext("2d")?.drawImage(photo, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return close();
              close(new File([blob], "photo.jpg", { type: "image/jpeg" }));
            },
            "image/jpeg",
            0.9,
          );
        });
      };
      photo.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("image"));
      };
      photo.src = url;
    });
  }

  function Cats(m: HTMLElement) {
    const cf: { ed: string | null; sub: string | null } = { ed: null, sub: null };
    let drag: string | null = null;
    m.innerHTML =
      hd("Catalogue", "Your <em>categories.</em>") +
      `<div class="g2"><div><div class="cd" id="tr" style="padding:12px"></div></div><div id="side"></div><div class="veil" id="veil" hidden><i class="spin"></i><span>Saving…</span></div></div>`;
    const find = (id: string): [StudioCat | StudioSub | null, StudioCat | null] => {
      for (const c of db.cats) {
        if (c.id == id) return [c, null];
        for (const s of c.subs || []) if (s.id == id) return [s, c];
      }
      return [null, null];
    };
    const cnt = (c: { id: string; subs?: { id: string }[] }) =>
      db.prods.filter((p) => p.cat == c.id || (c.subs || []).some((s) => s.id == p.cat)).length;
    const th = (x: { img?: string }) => (x.img ? `<img src="${x.img}">` : "<i></i>");
    let catBusy = false;
    const withBusy = async (label: string, work: () => Promise<void>) => {
      if (catBusy) return;
      catBusy = true;
      const show = (on: boolean) => {
        const v = $("#veil");
        const lab = v?.querySelector("span");
        if (lab) lab.textContent = label;
        if (v) v.hidden = !on;
      };
      show(true);
      try {
        await work();
      } finally {
        catBusy = false;
        show(false);
      }
    };
    const tree = () => {
      const T = $("#tr");
      if (!T) return;
      T.innerHTML = db.cats.length
        ? db.cats
            .map(
              (c) =>
                `<div class="tn ${cf.ed == c.id ? "on" : ""}" draggable="true" data-e="${c.id}"><span class="gr">⋮⋮</span>${th(c)}<span class="nm">${esc(c.name)}</span><small>${cnt(c)}</small><button class="x" data-s="${c.id}">Add sub</button><button class="x" data-d="${c.id}">${armed == c.id ? "Delete?" : "×"}</button></div>` +
                (c.subs || [])
                  .map(
                    (s) =>
                      `<div class="tn sub ${cf.ed == s.id ? "on" : ""}" draggable="true" data-e="${s.id}"><span class="gr">⋮⋮</span>${th(s)}<span class="nm">${esc(s.name)}</span><small>${cnt(s)}</small><button class="x" data-d="${s.id}">${armed == s.id ? "Delete?" : "×"}</button></div>`,
                  )
                  .join("") +
                (cf.sub == c.id ? '<div class="tn sub"><input class="in" id="ns" placeholder="Subcategory name, press Enter" style="margin:0"></div>' : ""),
            )
            .join("")
        : '<div class="em" style="border:0;margin:0"><b>No categories yet</b>Add one while you add a product.</div>';
      const ns = $("#ns") as HTMLInputElement | null;
      if (ns) {
        ns.focus();
        ns.onkeydown = async (e) => {
          if (e.key == "Escape") {
            cf.sub = null;
            tree();
          }
          if (e.key == "Enter" && ns.value.trim()) {
            const found = find(cf.sub || "");
            const c = found[0] as StudioCat | null;
            if (!c || !("subs" in c)) return;
            const name = ns.value.trim();
            c.subs = c.subs || [];
            const row = { id: uid(), name, slug: slug(name), img: "" };
            c.subs.push(row);
            cf.sub = null;
            await withBusy("Saving…", async () => {
              if (!(await save())) {
                c.subs = (c.subs || []).filter((s) => s.id != row.id);
                return;
              }
              tree();
            });
          }
        };
      }
      T.querySelectorAll("[data-e]").forEach((node) => {
        const n = node as HTMLElement;
        n.onclick = async (e) => {
          const id = n.dataset.e || "";
          const target = e.target as HTMLElement;
          if (target.dataset.s) {
            cf.sub = id;
            tree();
            return;
          }
          if (target.dataset.d) {
            if (armed == id) {
              const before = JSON.stringify(db.cats);
              const [it, par] = find(id);
              if (par && it) par.subs = (par.subs || []).filter((s) => s != it);
              else db.cats = db.cats.filter((c) => c != it);
              armed = null;
              if (cf.ed == id) cf.ed = null;
              await withBusy("Saving…", async () => {
                if (!(await save())) {
                  db.cats = JSON.parse(before) as StudioCat[];
                  return;
                }
                tree();
                side();
              });
            } else {
              armed = id;
              tree();
            }
            return;
          }
          armed = null;
          cf.ed = id;
          tree();
          side();
        };
        n.ondragstart = () => {
          drag = n.dataset.e || null;
        };
        n.ondragover = (e) => e.preventDefault();
        n.ondrop = async (e) => {
          e.preventDefault();
          const [a, pa] = find(drag || "");
          const [b, pb] = find(n.dataset.e || "");
          if (!a || a === b) return;
          if (pa !== pb) return toast("Drag within the same level");
          const before = JSON.stringify(db.cats);
          const arr = (pa ? pa.subs : db.cats) as ({ id: string } | StudioCat)[];
          arr.splice(arr.indexOf(a as never), 1);
          arr.splice(arr.indexOf(b as never), 0, a as never);
          await withBusy("Saving…", async () => {
            if (!(await save())) {
              db.cats = JSON.parse(before) as StudioCat[];
              return;
            }
            tree();
          });
        };
      });
    };
    const side = () => {
      const [it] = cf.ed ? find(cf.ed) : [null];
      const S = $("#side");
      if (!S) return;
      if (!it) {
        S.innerHTML =
          '<div class="cd"><h4>Photos and order</h4><p class="sub">New categories, recipients and occasions are added on the product.</p><p class="sub">Drag rows to change the order shoppers see. Open a row to crop its photo.</p></div>';
        return;
      }
      let img = it.img || "";
      S.innerHTML = `<div class="cd"><h4>Edit ${esc(it.name)}</h4><label>Name<input class="in" id="nm" value="${esc(it.name)}"></label><label>Image (optional)</label><div class="up" id="dz"></div><label>Web address ending<input class="in" id="sl" value="${esc(it.slug)}"></label><button class="btn p w" id="sv">Save changes</button></div>`;
      const zone = $("#dz");
      const pvImg = () => {
        if (zone) zone.innerHTML = img ? `<img src="${img}">` : UPTXT();
      };
      pvImg();
      if (zone)
        dropzone(zone, (fs) => {
          const file = fs[0];
          if (!file || catBusy) return;
          void (async () => {
            let cropped: File;
            try {
              cropped = await adjustCrop(file);
            } catch {
              return;
            }
            await withBusy("Uploading…", async () => {
              try {
                img = await readImg(cropped, 800);
                pvImg();
              } catch {
                toast("Could not upload that photo");
              }
            });
          })();
        });
      const nm = $("#nm") as HTMLInputElement | null;
      const sl = $("#sl") as HTMLInputElement | null;
      if (nm && sl)
        nm.oninput = (e) => {
          if (!sl.value || sl.value == slug(it.name)) sl.value = slug((e.target as HTMLInputElement).value);
        };
      const sv = $("#sv");
      if (sv)
        sv.onclick = () =>
          void withBusy("Saving…", async () => {
            const n = nm?.value.trim() || "";
            if (!n) return toast("Add a name");
            Object.assign(it, { name: n, slug: slug(sl?.value || n), img });
            if (!(await save())) return;
            toast("Saved");
            tree();
            side();
          });
    };
    tree();
    side();
  }

  function Store(m: HTMLElement) {
    const s = db.store;
    const h = s.hero;
    m.innerHTML =
      hd("Shop front", "Your <em>storefront.</em>", '<button class="btn p" id="s">Save changes</button>') +
      `<div class="g2"><div class="cd"><h4>Home page banner</h4><label>Small line above<input class="in" data-h="eyebrow"></label><div class="r2"><label>Headline, first line<input class="in" data-h="l1"></label><label>Headline, second line<input class="in" data-h="l2"></label></div><label>Short description<textarea class="in" data-h="sub"></textarea></label><div class="r2"><label>Main button<input class="in" data-h="cta"></label><label>Link text<input class="in" data-h="link"></label></div><label>Announcement bar<input class="in" id="b" value="${esc(s.banner)}" placeholder="Free gift wrapping on all orders"></label><label class="tg"><input type="checkbox" id="o" ${s.open ? "checked" : ""}> Store is open for orders</label></div>
 <div class="hero"><div class="eb"><i></i><span id="v-eyebrow"></span></div><h2><span id="v-l1"></span><em id="v-l2"></em></h2><p id="v-sub"></p><div class="row"><span class="btn p" id="v-cta"></span><u id="v-link"></u></div></div></div>`;
    const pv = () =>
      (Object.keys(h) as (keyof typeof h)[]).forEach((k) => {
        const el = $("#v-" + k);
        if (el) el.textContent = h[k];
      });
    m.querySelectorAll("[data-h]").forEach((node) => {
      const i = node as HTMLInputElement;
      i.value = h[i.dataset.h as keyof typeof h] || "";
      i.oninput = () => {
        const key = i.dataset.h as keyof typeof h;
        if (key) h[key] = i.value;
        pv();
      };
    });
    pv();
    const saveBtn = $("#s");
    if (saveBtn)
      saveBtn.onclick = async () => {
        const b = $("#b") as HTMLInputElement | null;
        const o = $("#o") as HTMLInputElement | null;
        s.banner = b?.value || "";
        s.open = !!o?.checked;
        if (!(await save())) return;
        toast("Saved");
      };
  }

  function Notes(m: HTMLElement) {
    m.innerHTML =
      hd("Activity", "Your <em>notifications.</em>", db.notes.length ? '<button class="btn" id="mr">Mark all read</button>' : "") +
      `<div class="cd">${
        db.notes.length
          ? db.notes
              .map((n) => `<div class="nt ${n.read ? "rd" : ""}"><i></i><div>${esc(n.msg)}<small>${new Date(n.at).toLocaleString()}</small></div></div>`)
              .join("")
          : '<div class="em" style="border:0;margin:0"><b>All caught up</b>New orders, inquiries, reviews and low stock alerts show up here.</div>'
      }</div>`;
    const mr = $("#mr");
    if (db.notes.length && mr)
      mr.onclick = async () => {
        db.notes.forEach((n) => {
          n.read = true;
        });
        if (!(await save())) return;
        render();
      };
  }

  const K = {
    orders: {
      eb: "Sales",
      t: "Your <em>orders.</em>",
      one: "order",
      st: ["New", "Packed", "Shipped", "Delivered", "Cancelled"],
      f: [
        ["customer", "Customer"],
        ["product", "Product", "prod"],
        ["qty", "Quantity", "number"],
        ["total", "Total (₹)", "number"],
        ["note", "Personalisation details", "area"],
      ],
      cols: ["customer", "product", "qty", "total"],
      n: (r: Record<string, string>) => "New order from " + r.customer,
    },
    inquiries: {
      eb: "Sales",
      t: "Bulk <em>inquiries.</em>",
      one: "inquiry",
      st: ["New", "Quoted", "Won", "Lost"],
      f: [
        ["company", "Company"],
        ["contact", "Phone or email"],
        ["product", "Product interest", "prod"],
        ["qty", "Quantity", "number"],
        ["note", "Message", "area"],
      ],
      cols: ["company", "contact", "product", "qty"],
      n: (r: Record<string, string>) => "Bulk inquiry from " + r.company,
    },
    reviews: {
      eb: "Community",
      t: "Your <em>reviews.</em>",
      one: "review",
      st: ["Pending", "Approved", "Hidden"],
      f: [
        ["product", "Product", "prod"],
        ["customer", "Customer"],
        ["rating", "Rating", "rate"],
        ["note", "Review", "area"],
      ],
      cols: ["product", "customer", "rating", "note"],
      n: (r: Record<string, string>) => "New review for " + r.product,
    },
    users: {
      eb: "Team",
      t: "Your <em>users.</em>",
      one: "user",
      st: ["Active", "Disabled"],
      f: [
        ["name", "Name"],
        ["email", "Email"],
        ["role", "Role", "role"],
      ],
      cols: ["name", "email", "role"],
      n: null as null | ((r: Record<string, string>) => string),
    },
  };

  function Recs(m: HTMLElement) {
    const k = K[view as keyof typeof K];
    if (!k) return;
    const all = (db.recs[view as keyof StudioDb["recs"]] || []) as Record<string, string>[];
    let fs = "All";
    let open = false;
    m.innerHTML =
      hd(k.eb, k.t, `<button class="btn p" id="ad">Add ${k.one}</button>`) +
      '<div class="cd" id="fm" style="display:none;margin-bottom:18px"></div><div class="cd"><div class="ch" id="fl" style="margin:0"></div><div id="ls"></div></div>';
    const fld = (entry: string[]) => {
      const [n, l, t] = entry;
      return t == "prod" && db.prods.length
        ? `<label>${l}<select class="in" data-f="${n}"><option value="">Select…</option>${db.prods.map((p) => `<option>${esc(p.name)}</option>`).join("")}</select></label>`
        : t == "area"
          ? `<label>${l}<textarea class="in" data-f="${n}"></textarea></label>`
          : t == "rate"
            ? `<label>${l}<select class="in" data-f="${n}">${[5, 4, 3, 2, 1].map((x) => `<option>${x}</option>`).join("")}</select></label>`
            : t == "role"
              ? `<label>${l}<select class="in" data-f="${n}"><option>Admin</option><option>Staff</option></select></label>`
              : `<label>${l}<input class="in" ${t == "number" ? 'type="number" min="0"' : ""} data-f="${n}"></label>`;
    };
    const draw = () => {
      const fl = $("#fl");
      const ls = $("#ls");
      if (!fl || !ls) return;
      fl.innerHTML = ["All", ...k.st].map((s) => `<span class="c ${fs == s ? "on" : ""}" data-s="${s}">${s}</span>`).join("");
      fl.querySelectorAll("[data-s]").forEach((c) => {
        (c as HTMLElement).onclick = () => {
          fs = (c as HTMLElement).dataset.s || "All";
          draw();
        };
      });
      const l = all.filter((r) => fs == "All" || r.status == fs);
      ls.innerHTML = l.length
        ? `<table class="tb"><tr>${k.cols.map((c) => `<th>${c[0].toUpperCase() + c.slice(1)}</th>`).join("")}<th>Status</th><th></th></tr>${l
            .map(
              (r) =>
                `<tr>${k.cols
                  .map((c) => `<td>${c == "rating" ? "★".repeat(+r.rating) + "☆".repeat(5 - +r.rating) : c == "total" ? "₹" + esc(r.total) : esc(r[c])}</td>`)
                  .join("")}<td><select data-st="${r.id}">${k.st.map((s) => `<option ${s == r.status ? "selected" : ""}>${s}</option>`).join("")}</select></td><td><button class="x" data-x="${r.id}">×</button></td></tr>`,
            )
            .join("")}</table>`
        : `<div class="em" style="border:0"><b>Nothing here yet</b>${all.length ? "No records with this status." : `Add your first ${k.one} to get started.`}</div>`;
      ls.querySelectorAll("[data-st]").forEach((node) => {
        const s = node as HTMLSelectElement;
        s.onchange = async () => {
          const row = all.find((r) => r.id == s.dataset.st);
          if (row) row.status = s.value;
          if (!(await save())) return;
          draw();
        };
      });
      ls.querySelectorAll("[data-x]").forEach((b) => {
        (b as HTMLElement).onclick = async () => {
          const id = (b as HTMLElement).dataset.x;
          const next = all.filter((r) => r.id != id);
          db.recs[view as keyof StudioDb["recs"]] = next as never;
          all.splice(0, all.length, ...next);
          if (!(await save())) return;
          draw();
        };
      });
    };
    const ad = $("#ad");
    if (ad)
      ad.onclick = () => {
        open = !open;
        const F = $("#fm");
        if (!F) return;
        F.style.display = open ? "block" : "none";
        if (!open) return;
        F.innerHTML = `<h4>New ${k.one}</h4><div class="r2">${k.f.map(fld).join("")}</div><button class="btn p" id="sv" style="margin-top:20px">Save ${k.one}</button>`;
        const sv = $("#sv");
        if (sv)
          sv.onclick = async () => {
            const r: Record<string, string> = { id: uid(), status: k.st[0], at: String(Date.now()) };
            F.querySelectorAll("[data-f]").forEach((node) => {
              const i = node as HTMLInputElement;
              r[i.dataset.f || ""] = i.value;
            });
            if (!(r[k.f[0][0]] || "").trim()) return toast("Fill in the first field");
            all.unshift(r);
            if (k.n) note(k.n(r));
            if (!(await save())) {
              all.shift();
              return;
            }
            toast("Saved");
            render();
          };
      };
    draw();
  }


  render();
  return () => {
    stopShapeEdit();
    root.removeEventListener("click", onClick);
    root.innerHTML = "";
  };
}

type StudioSub = { id: string; name: string; slug: string; img: string };
type StudioCat = StudioSub & { subs: StudioSub[] };
type StudioProduct = {
  id: string;
  status: string;
  cat: string;
  rec: string[];
  occ: string[];
  name: string;
  price: string | number;
  compare: string | number;
  stock: string | number;
  sku: string;
  brand: string;
  slug: string;
  imgs: { src: string; enh: boolean }[];
  colours: { id: string; n: string; hex: string; img: number | "" }[];
  sizes: string[];
  vs: Record<string, string | number>;
  desc: string;
  specs: [string, string][];
  mfr: string;
  country: string;
  pers: { text: boolean; label: string; max: number | string; photo: boolean; note: boolean; fee: number | string };
  print?: { on: boolean; photo: number; zone: { x: number; y: number; w: number; h: number }; shape?: PrintShape; kind: DesignKind; sample: string };
};
type StudioDb = {
  cats: StudioCat[];
  prods: StudioProduct[];
  notes: { id: string; msg: string; at: number; read: boolean }[];
  store: {
    name: string;
    banner: string;
    open: boolean;
    hero: { eyebrow: string; l1: string; l2: string; sub: string; cta: string; link: string };
    recipients: string[];
    occasions: string[];
  };
  recs: {
    orders: Record<string, string>[];
    inquiries: Record<string, string>[];
    reviews: Record<string, string>[];
    users: Record<string, string>[];
  };
  known: {
    cats: string[];
    subs: string[];
    orders: string[];
    inquiries: string[];
    reviews: string[];
    users: string[];
    notes: string[];
  };
};
