import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import mongoose, { type Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { slugify } from "@/lib/slugify";
import { AdminNote } from "@/lib/models/AdminNote";
import { BulkInquiry } from "@/lib/models/BulkInquiry";
import { Category } from "@/lib/models/Category";
import { Order } from "@/lib/models/Order";
import { Product } from "@/lib/models/Product";
import { Review } from "@/lib/models/Review";
import { StorefrontSettings } from "@/lib/models/StorefrontSettings";
import { Subcategory } from "@/lib/models/Subcategory";
import { User } from "@/lib/models/User";
import { normalizeKind } from "@/lib/studio/composePrint";
import { normalizeShape, shapeBounds } from "@/lib/studio/printShape";

const DH = {
  eyebrow: "Made to feel like yours",
  l1: "Little details.",
  l2: "Big meaning.",
  sub: "Custom apparel and thoughtful gifts that turn everyday things into something personal.",
  cta: "Explore the collection",
  link: "Get to know us",
};

type IdRec = { id: string };

export type StudioDb = {
  cats: StudioCat[];
  prods: StudioProduct[];
  notes: StudioNote[];
  store: StudioStore;
  recs: {
    orders: StudioOrder[];
    inquiries: StudioInquiry[];
    reviews: StudioReview[];
    users: StudioUser[];
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

type StudioCat = {
  id: string;
  name: string;
  slug: string;
  img: string;
  subs: { id: string; name: string; slug: string; img: string }[];
};

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
  pers: {
    text: boolean;
    label: string;
    max: number | string;
    photo: boolean;
    note: boolean;
    fee: number | string;
  };
  print?: { on: boolean; photo: number; zone: { x: number; y: number; w: number; h: number }; shape?: unknown; kind: string; sample: string };
};

type StudioNote = { id: string; msg: string; at: number; read: boolean };
const DEFAULT_RECIPIENTS = ["him", "her", "kids", "couples", "Corporate"];
const DEFAULT_OCCASIONS = ["Birthday", "Wedding", "Anniversary", "Festive", "Baby"];

type StudioStore = {
  name: string;
  banner: string;
  open: boolean;
  hero: typeof DH;
  recipients: string[];
  occasions: string[];
};

function facetSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function nameList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const name = String(item ?? "").trim().slice(0, 40);
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.length ? out : fallback;
}
type StudioOrder = {
  id: string;
  status: string;
  at: number;
  customer: string;
  product: string;
  qty: string | number;
  total: string | number;
  note: string;
};
type StudioInquiry = {
  id: string;
  status: string;
  at: number;
  company: string;
  contact: string;
  product: string;
  qty: string | number;
  note: string;
};
type StudioReview = {
  id: string;
  status: string;
  at: number;
  product: string;
  customer: string;
  rating: string | number;
  note: string;
};
type StudioUser = {
  id: string;
  status: string;
  at: number;
  name: string;
  email: string;
  role: string;
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function sid(doc: { studioKey?: string | null; _id: Types.ObjectId }): string {
  return doc.studioKey?.trim() || String(doc._id);
}

async function findByKey(model: { findById: (id: string) => Promise<any>; findOne: (q: object) => Promise<any> }, id: string) {
  if (!id) return null;
  if (mongoose.isValidObjectId(id)) {
    const byId = await model.findById(id);
    if (byId) return byId;
  }
  return model.findOne({ studioKey: id });
}

function rupees(v: unknown): number {
  if (v === "" || v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}

function paise(v: unknown): number {
  return Math.round(rupees(v) * 100);
}

function combos(p: StudioProduct) {
  const colours = Array.isArray(p.colours) ? p.colours : [];
  const sizes = Array.isArray(p.sizes) ? p.sizes : [];
  const C = colours.length ? colours : [null];
  const S = sizes.length ? sizes : [null];
  return colours.length || sizes.length
    ? C.flatMap((c) => S.map((s) => ({ c, s, k: `${c ? c.id : "-"}|${s || "-"}` })))
    : [];
}

function totalUnits(p: StudioProduct): number {
  const rows = combos(p);
  if (!rows.length) return Math.max(0, Math.round(Number(p.stock) || 0));
  return rows.reduce((sum, row) => sum + Math.max(0, Math.round(Number(p.vs?.[row.k]) || 0)), 0);
}

function orderStatusOut(status: string): string {
  if (status === "shipped") return "Shipped";
  if (status === "delivered") return "Delivered";
  if (status === "cancelled") return "Cancelled";
  if (status === "processing" || status === "in_production" || status === "awaiting_proof" || status === "proof_sent") {
    return "Packed";
  }
  return "New";
}

function orderStatusIn(label: string): string {
  if (label === "Packed") return "processing";
  if (label === "Shipped") return "shipped";
  if (label === "Delivered") return "delivered";
  if (label === "Cancelled") return "cancelled";
  return "paid";
}

function inquiryStatusOut(status: string): string {
  if (status === "quoted" || status === "contacted") return "Quoted";
  if (status === "won") return "Won";
  if (status === "lost") return "Lost";
  return "New";
}

function inquiryStatusIn(label: string): "new" | "quoted" | "won" | "lost" {
  if (label === "Quoted") return "quoted";
  if (label === "Won") return "won";
  if (label === "Lost") return "lost";
  return "new";
}

function reviewStatusOut(doc: { isApproved?: boolean; isRejected?: boolean }): string {
  if (doc.isRejected) return "Hidden";
  if (doc.isApproved) return "Approved";
  return "Pending";
}

function emptyKnown(): StudioDb["known"] {
  return { cats: [], subs: [], orders: [], inquiries: [], reviews: [], users: [], notes: [] };
}

export async function recordAdminNote(msg: string): Promise<void> {
  const text = msg.trim();
  if (!text) return;
  await connectDb();
  await AdminNote.create({
    studioKey: randomBytes(8).toString("hex"),
    msg: text.slice(0, 500),
    at: Date.now(),
    read: false,
  });
}

export async function isStoreOpen(): Promise<boolean> {
  await connectDb();
  const doc = await StorefrontSettings.findOne({ singletonKey: "default" }).select("ordersOpen").lean();
  return doc?.ordersOpen !== false;
}

export async function getPublicNotice(): Promise<{ banner: string; open: boolean }> {
  await connectDb();
  const doc = await StorefrontSettings.findOne({ singletonKey: "default" }).select("banner ordersOpen").lean();
  return { banner: doc?.banner?.trim() || "", open: doc?.ordersOpen !== false };
}

export async function loadStudio(): Promise<StudioDb> {
  await connectDb();
  const [cats, subs, prods, notes, storeDoc, orders, inquiries, reviews, users] = await Promise.all([
    Category.find().sort({ sortOrder: 1, name: 1 }).lean(),
    Subcategory.find().sort({ sortOrder: 1, name: 1 }).lean(),
    Product.find().sort({ updatedAt: -1 }).lean(),
    AdminNote.find().sort({ at: -1 }).limit(200).lean(),
    StorefrontSettings.findOne({ singletonKey: "default" }).lean(),
    Order.find().sort({ createdAt: -1 }).limit(200).lean(),
    BulkInquiry.find().sort({ createdAt: -1 }).limit(200).lean(),
    Review.find().sort({ createdAt: -1 }).limit(200).lean(),
    User.find({
      $or: [{ role: "admin" }, { teamRole: { $in: ["admin", "staff"] } }, { studioKey: { $exists: true, $ne: "" } }],
    })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const tree: StudioCat[] = cats.map((c) => ({
    id: sid(c),
    name: c.name,
    slug: c.slug,
    img: c.imageUrl || c.images?.[0] || "",
    subs: subs
      .filter((s) => String(s.categoryId) === String(c._id))
      .map((s) => ({
        id: sid(s),
        name: s.name,
        slug: s.slug,
        img: s.imageUrl || s.images?.[0] || "",
      })),
  }));

  const heroRaw = asRecord(storeDoc?.hero);
  const hero = {
    eyebrow: typeof heroRaw.eyebrow === "string" ? heroRaw.eyebrow : DH.eyebrow,
    l1: typeof heroRaw.l1 === "string" ? heroRaw.l1 : DH.l1,
    l2: typeof heroRaw.l2 === "string" ? heroRaw.l2 : DH.l2,
    sub: typeof heroRaw.sub === "string" ? heroRaw.sub : DH.sub,
    cta: typeof heroRaw.cta === "string" ? heroRaw.cta : DH.cta,
    link: typeof heroRaw.link === "string" ? heroRaw.link : DH.link,
  };

  const productName = new Map(prods.map((p) => [String(p._id), p.name]));

  return {
    cats: tree,
    prods: prods.map(productOut),
    notes: notes.map((n) => ({ id: sid(n), msg: n.msg, at: n.at, read: Boolean(n.read) })),
    store: {
      name: "Pris Creations",
      banner: storeDoc?.banner ?? "",
      open: storeDoc?.ordersOpen !== false,
      hero,
      recipients: nameList(storeDoc?.recipients, DEFAULT_RECIPIENTS),
      occasions: nameList(storeDoc?.occasions, DEFAULT_OCCASIONS),
    },
    recs: {
      orders: orders.map((o) => orderOut(o, productName)),
      inquiries: inquiries.map(inquiryOut),
      reviews: reviews.map((r) => reviewOut(r, productName)),
      users: users.map(userOut),
    },
    known: {
      cats: tree.map((c) => c.id),
      subs: tree.flatMap((c) => c.subs.map((s) => s.id)),
      orders: orders.map((o) => sid(o)),
      inquiries: inquiries.map((r) => sid(r)),
      reviews: reviews.map((r) => sid(r)),
      users: users.map((u) => sid(u)),
      notes: notes.map((n) => sid(n)),
    },
  };
}

function productOut(doc: {
  studioKey?: string | null;
  _id: Types.ObjectId;
  studio?: unknown;
  name: string;
  slug: string;
  sku: string;
  brand?: string | null;
  description?: string | null;
  pricePaise: number;
  compareAtPaise?: number | null;
  stock: number;
  status?: string | null;
  images?: string[] | null;
  recipients?: string[] | null;
  occasions?: string[] | null;
  categoryId?: Types.ObjectId | null;
  subcategoryId?: Types.ObjectId | null;
  manufacturerName?: string | null;
  countryOfOrigin?: string | null;
  specificationRows?: { key: string; value: string }[] | null;
  sceneBaseUrl?: string | null;
  sceneZone?: { x?: number; y?: number; w?: number; h?: number } | null;
  sceneDesignMode?: string | null;
}): StudioProduct {
  const stored = asRecord(doc.studio);
  const withPrint = (product: StudioProduct): StudioProduct => {
    if (product.print?.zone || !doc.sceneBaseUrl) return product;
    const images = doc.images ?? [];
    const photo = Math.max(0, images.indexOf(doc.sceneBaseUrl));
    return {
      ...product,
      print: {
        on: true,
        photo,
        zone: shapeBounds(normalizeShape(doc.sceneZone)),
        shape: normalizeShape(doc.sceneZone),
        kind: normalizeKind(doc.sceneDesignMode),
        sample: "",
      },
    };
  };
  if (stored.name != null || stored.imgs != null || stored.colours != null) {
    return withPrint({ ...(stored as StudioProduct), id: sid(doc) });
  }
  const status = (doc.status || "DRAFT").toLowerCase();
  return withPrint({
    id: sid(doc),
    status: status === "published" ? "published" : status === "archived" ? "archived" : "draft",
    cat: "",
    rec: doc.recipients ?? [],
    occ: doc.occasions ?? [],
    name: doc.name,
    price: doc.pricePaise ? doc.pricePaise / 100 : "",
    compare: doc.compareAtPaise ? doc.compareAtPaise / 100 : "",
    stock: doc.stock ?? "",
    sku: doc.sku,
    brand: doc.brand || "",
    slug: doc.slug,
    imgs: (doc.images ?? []).map((src) => ({ src, enh: false })),
    colours: [],
    sizes: [],
    vs: {},
    desc: doc.description || "",
    specs: (doc.specificationRows ?? []).map((row) => [row.key, row.value]),
    mfr: doc.manufacturerName || "",
    country: doc.countryOfOrigin || "",
    pers: { text: false, label: "Name or message", max: 30, photo: false, note: false, fee: "" },
  });
}

function orderOut(
  doc: {
    studioKey?: string | null;
    _id: Types.ObjectId;
    studio?: unknown;
    status: string;
    createdAt?: Date;
    guestEmail?: string | null;
    totalPaise: number;
    shipping?: { fullName?: string } | null;
    items?: { name?: string; quantity?: number }[] | null;
    notes?: string | null;
  },
  productName: Map<string, string>,
): StudioOrder {
  const stored = asRecord(doc.studio);
  if (typeof stored.customer === "string") {
    return { ...(stored as StudioOrder), id: sid(doc), status: orderStatusOut(doc.status) };
  }
  const item = doc.items?.[0];
  return {
    id: sid(doc),
    status: orderStatusOut(doc.status),
    at: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
    customer: doc.shipping?.fullName || doc.guestEmail || "Customer",
    product: item?.name || "",
    qty: item?.quantity ?? "",
    total: doc.totalPaise ? doc.totalPaise / 100 : "",
    note: doc.notes || "",
  };
}

function inquiryOut(doc: {
  studioKey?: string | null;
  _id: Types.ObjectId;
  studio?: unknown;
  status: string;
  createdAt?: Date;
  company: string;
  email: string;
  phone: string;
  productInterest?: string | null;
  quantity?: number | null;
  notes?: string | null;
}): StudioInquiry {
  const stored = asRecord(doc.studio);
  if (typeof stored.company === "string") {
    return { ...(stored as StudioInquiry), id: sid(doc), status: inquiryStatusOut(doc.status) };
  }
  return {
    id: sid(doc),
    status: inquiryStatusOut(doc.status),
    at: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
    company: doc.company,
    contact: doc.email?.includes("@prisbo.local") ? doc.phone : doc.email || doc.phone,
    product: doc.productInterest || "",
    qty: doc.quantity ?? "",
    note: doc.notes || "",
  };
}

function reviewOut(
  doc: {
    studioKey?: string | null;
    _id: Types.ObjectId;
    studio?: unknown;
    isApproved?: boolean;
    isRejected?: boolean;
    createdAt?: Date;
    productId: Types.ObjectId;
    guestName?: string | null;
    rating: number;
    body: string;
  },
  productName: Map<string, string>,
): StudioReview {
  const stored = asRecord(doc.studio);
  if (typeof stored.customer === "string" || typeof stored.product === "string") {
    return { ...(stored as StudioReview), id: sid(doc), status: reviewStatusOut(doc) };
  }
  return {
    id: sid(doc),
    status: reviewStatusOut(doc),
    at: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
    product: productName.get(String(doc.productId)) || "",
    customer: doc.guestName || "Customer",
    rating: doc.rating,
    note: doc.body,
  };
}

function userOut(doc: {
  studioKey?: string | null;
  _id: Types.ObjectId;
  name: string;
  email: string;
  role: string;
  teamRole?: "admin" | "staff" | null;
  disabled?: boolean | null;
  createdAt?: Date;
}): StudioUser {
  const role = doc.teamRole === "staff" ? "Staff" : doc.role === "admin" || doc.teamRole === "admin" ? "Admin" : "Staff";
  return {
    id: sid(doc),
    status: doc.disabled ? "Disabled" : "Active",
    at: doc.createdAt ? new Date(doc.createdAt).getTime() : Date.now(),
    name: doc.name,
    email: doc.email,
    role,
  };
}

function assertDb(raw: unknown): StudioDb {
  const body = asRecord(raw);
  const recs = asRecord(body.recs);
  const known = asRecord(body.known);
  const ids = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  return {
    cats: Array.isArray(body.cats) ? (body.cats as StudioCat[]) : [],
    prods: Array.isArray(body.prods) ? (body.prods as StudioProduct[]) : [],
    notes: Array.isArray(body.notes) ? (body.notes as StudioNote[]) : [],
    store: {
      name: "Pris Creations",
      banner: typeof asRecord(body.store).banner === "string" ? String(asRecord(body.store).banner) : "",
      open: asRecord(body.store).open !== false,
      hero: { ...DH, ...asRecord(asRecord(body.store).hero) } as typeof DH,
      recipients: nameList(asRecord(body.store).recipients, DEFAULT_RECIPIENTS),
      occasions: nameList(asRecord(body.store).occasions, DEFAULT_OCCASIONS),
    },
    recs: {
      orders: Array.isArray(recs.orders) ? (recs.orders as StudioOrder[]) : [],
      inquiries: Array.isArray(recs.inquiries) ? (recs.inquiries as StudioInquiry[]) : [],
      reviews: Array.isArray(recs.reviews) ? (recs.reviews as StudioReview[]) : [],
      users: Array.isArray(recs.users) ? (recs.users as StudioUser[]) : [],
    },
    known: {
      cats: ids(known.cats),
      subs: ids(known.subs),
      orders: ids(known.orders),
      inquiries: ids(known.inquiries),
      reviews: ids(known.reviews),
      users: ids(known.users),
      notes: ids(known.notes),
    },
  };
}

async function uniqueField(
  model: { exists: (q: object) => Promise<unknown> },
  field: "slug" | "sku",
  wanted: string,
  self?: Types.ObjectId,
): Promise<string> {
  const base = (wanted || "item").slice(0, 70);
  let value = base;
  let n = 1;
  while (
    await model.exists({
      [field]: value,
      ...(self ? { _id: { $ne: self } } : {}),
    } as never)
  ) {
    n += 1;
    value = `${base}-${n}`.slice(0, 80);
  }
  return value;
}

export async function saveStudio(raw: unknown, actorId: string): Promise<StudioDb> {
  const db = assertDb(raw);
  await connectDb();
  const catIds = new Map<string, Types.ObjectId>();
  const subIds = new Map<string, { id: Types.ObjectId; parent: Types.ObjectId }>();
  const keptCats: Types.ObjectId[] = [];
  const keptSubs: Types.ObjectId[] = [];

  for (let i = 0; i < db.cats.length; i += 1) {
    const cat = db.cats[i];
    if (!cat?.name?.trim()) throw new Error("Add a category name");
    const existing = cat.id ? await findByKey(Category, cat.id) : null;
    const slug = await uniqueField(Category, "slug", slugify(cat.slug || cat.name), existing?._id);
    const set = {
      name: cat.name.trim(),
      slug,
      sortOrder: i,
      imageUrl: typeof cat.img === "string" ? cat.img : "",
      images: cat.img ? [cat.img] : [],
      studioKey: existing?.studioKey || cat.id,
    };
    const id = existing
      ? (await Category.updateOne({ _id: existing._id }, { $set: set }), existing._id)
      : (await Category.create(set))._id;
    keptCats.push(id);
    catIds.set(cat.id, id);
    cat.slug = slug;
    for (let s = 0; s < (cat.subs || []).length; s += 1) {
      const sub = cat.subs[s];
      if (!sub?.name?.trim()) throw new Error("Add a subcategory name");
      const existingSub = sub.id ? await findByKey(Subcategory, sub.id) : null;
      const subSlug = await uniqueField(Subcategory, "slug", slugify(sub.slug || sub.name), existingSub?._id);
      const subSet = {
        categoryId: id,
        name: sub.name.trim(),
        slug: subSlug,
        sortOrder: s,
        imageUrl: typeof sub.img === "string" ? sub.img : "",
        images: sub.img ? [sub.img] : [],
        studioKey: existingSub?.studioKey || sub.id,
      };
      const subId = existingSub
        ? (await Subcategory.updateOne({ _id: existingSub._id }, { $set: subSet }), existingSub._id)
        : (await Subcategory.create(subSet))._id;
      keptSubs.push(subId);
      subIds.set(sub.id, { id: subId, parent: id });
      sub.slug = subSlug;
    }
  }

  const knownCats = new Set(db.known.cats.length ? db.known.cats : db.cats.map((c) => c.id));
  const knownSubs = new Set(db.known.subs.length ? db.known.subs : db.cats.flatMap((c) => c.subs.map((s) => s.id)));
  const liveCatIds = new Set(db.cats.map((c) => c.id));
  const liveSubIds = new Set(db.cats.flatMap((c) => (c.subs || []).map((s) => s.id)));
  for (const id of knownCats) {
    if (liveCatIds.has(id)) continue;
    const doc = await findByKey(Category, id);
    if (doc) await Category.deleteOne({ _id: doc._id });
  }
  for (const id of knownSubs) {
    if (liveSubIds.has(id)) continue;
    const doc = await findByKey(Subcategory, id);
    if (doc) await Subcategory.deleteOne({ _id: doc._id });
  }
  if (keptCats.length) await Subcategory.deleteMany({ categoryId: { $nin: keptCats } });

  for (const p of db.prods) {
    if (!p?.name?.trim()) throw new Error("Add a name first");
    if ((p.imgs || []).some((img) => typeof img?.src === "string" && img.src.startsWith("data:"))) {
      throw new Error("A photo is still uploading. Try again.");
    }
    const existing = p.id ? await findByKey(Product, p.id) : null;
    const slug = await uniqueField(Product, "slug", slugify(p.slug || p.name), existing?._id);
    const sku = await uniqueField(Product, "sku", (p.sku || "").trim() || `PC-${randomBytes(3).toString("hex").toUpperCase()}`, existing?._id);
    p.slug = slug;
    p.sku = sku;
    const where = subIds.get(p.cat);
    const categoryId = where?.parent || catIds.get(p.cat);
    const subcategoryId = where?.id;
    const images = (p.imgs || []).map((img) => img.src).filter((src) => typeof src === "string" && src && !src.startsWith("data:"));
    const colours = Array.isArray(p.colours) ? p.colours : [];
    const sizes = Array.isArray(p.sizes) ? p.sizes : [];
    const usedKeys = new Set<string>();
    const colorVariants = colours.map((c, index) => {
      let key = slugify(c.n || "colour") || "colour";
      if (usedKeys.has(key)) key = `${key}-${index + 1}`;
      usedKeys.add(key);
      const linked = c.img === "" || c.img == null ? "" : images[Number(c.img)] || "";
      return {
        key,
        label: (c.n || "Colour").slice(0, 120),
        images: linked ? [linked] : images[0] ? [images[0]] : [],
      };
    });
    const colourVariants = colours.map((c, index) => {
      const linked = c.img === "" || c.img == null ? "" : images[Number(c.img)] || "";
      const sizeRows = sizes.length
        ? sizes.map((size) => ({
            size,
            stock: Math.max(0, Math.round(Number(p.vs?.[`${c.id}|${size}`]) || 0)),
            isActive: true,
          }))
        : [{ size: "One", stock: Math.max(0, Math.round(Number(p.vs?.[`${c.id}|-`]) || 0)), isActive: true }];
      return {
        displayName: (c.n || "Colour").slice(0, 80),
        hexCode: c.hex || "#000000",
        skuSuffix: `${slugify(c.n || "c") || "c"}-${index + 1}`,
        basePrice: rupees(p.price),
        mrp: Math.max(rupees(p.compare), rupees(p.price)),
        isActive: true,
        displayOrder: index,
        images: linked ? [{ url: linked, isPrimary: true, displayOrder: 0 }] : [],
        sizeStocks: sizeRows,
      };
    });
    const pers = p.pers || { text: false, label: "", max: 30, photo: false, note: false, fee: "" };
    const status = p.status === "published" ? "PUBLISHED" : p.status === "archived" ? "ARCHIVED" : "DRAFT";
    const pricePaise = paise(p.price);
    const comparePaise = paise(p.compare);
    const fields = {
      studioKey: existing?.get("studioKey") || p.id,
      studio: { ...p, id: undefined, slug, sku },
      name: p.name.trim(),
      slug,
      sku,
      skuBase: sku,
      brand: (p.brand || "").trim(),
      description: p.desc || "",
      pricePaise,
      stock: totalUnits({ ...p, sku, slug }),
      images,
      status,
      isActive: status !== "ARCHIVED",
      ...(status === "PUBLISHED" ? { publishedAt: existing?.get("publishedAt") || new Date() } : {}),
      recipients: (p.rec || []).map((r) => facetSlug(String(r))).filter(Boolean),
      occasions: p.occ || [],
      categoryId: categoryId || undefined,
      subcategoryId: subcategoryId || undefined,
      hasColourVariants: colours.length > 0,
      sizesNotApplicable: sizes.length === 0,
      colourVariants,
      colorVariants,
      specificationRows: (p.specs || [])
        .filter((row) => row?.[0]?.trim() && row?.[1]?.trim())
        .map((row) => ({ key: row[0].trim(), value: row[1].trim() })),
      manufacturerName: (p.mfr || "").trim(),
      countryOfOrigin: (p.country || "").trim() || "India",
      customizationTextLabel: pers.label || "Name or message",
      customizationTextMaxLength: Math.max(1, Math.round(Number(pers.max) || 30)),
      customizationImageRequired: false,
      customizationTextRequired: false,
      personalisationFeePaise: paise(pers.fee),
      featured: false,
      allowCustomerCustomization: Boolean(pers.text || pers.photo || pers.note || p.print?.on),
    };
    const set: Record<string, unknown> = { ...fields };
    const print = p.print;
    const printPhoto = print?.on ? images[Number(print.photo)] : "";
    if (print?.on && printPhoto) {
      set.sceneBaseUrl = printPhoto;
      set.sceneZone = normalizeShape(print.shape ?? print.zone);
      set.sceneDesignMode = normalizeKind(print.kind);
      set.scenePlaceholder = "Your design";
      set.sceneBeforeUrl = "";
      set.sceneAfterUrl = "";
      set.sceneOnHome = false;
    } else {
      set.sceneBaseUrl = "";
      set.sceneZone = null;
      set.sceneDesignMode = "";
      set.scenePlaceholder = "";
      set.sceneBeforeUrl = "";
      set.sceneAfterUrl = "";
      set.sceneOnHome = false;
    }
    if (comparePaise > pricePaise) set.compareAtPaise = comparePaise;
    if (existing) {
      await Product.updateOne(
        { _id: existing._id },
        comparePaise > pricePaise ? { $set: set } : { $set: set, $unset: { compareAtPaise: "" } },
      );
    } else {
      await Product.create(set);
    }
  }

  const heroIn = db.store.hero || DH;
  await StorefrontSettings.findOneAndUpdate(
    { singletonKey: "default" },
    {
      $set: {
        banner: db.store.banner || "",
        ordersOpen: db.store.open !== false,
        recipients: db.store.recipients,
        occasions: db.store.occasions,
        hero: {
          eyebrow: heroIn.eyebrow ?? "",
          l1: heroIn.l1 ?? "",
          l2: heroIn.l2 ?? "",
          sub: heroIn.sub ?? "",
          cta: heroIn.cta ?? "",
          link: heroIn.link ?? "",
        },
      },
    },
    { upsert: true },
  );

  for (const note of db.notes) {
    if (!note?.msg?.trim() || !note.id) continue;
    const existing = await findByKey(AdminNote, note.id);
    const set = { msg: note.msg.slice(0, 500), at: Number(note.at) || Date.now(), read: Boolean(note.read), studioKey: existing?.get("studioKey") || note.id };
    if (existing) await AdminNote.updateOne({ _id: existing._id }, { $set: set });
    else await AdminNote.create(set);
  }

  await syncOrders(db);
  await syncInquiries(db);
  await syncReviews(db, actorId);
  await syncUsers(db, actorId);
  return loadStudio();
}

async function removeMissing(ids: string[], live: string[], drop: (id: string) => Promise<void>) {
  const current = new Set(live);
  for (const id of ids) {
    if (!current.has(id)) await drop(id);
  }
}

async function syncOrders(db: StudioDb) {
  const known = db.known.orders.length ? db.known.orders : db.recs.orders.map((r) => r.id);
  await removeMissing(known, db.recs.orders.map((r) => r.id), async (id) => {
    const doc = await findByKey(Order, id);
    if (doc) await Order.deleteOne({ _id: doc._id });
  });
  for (const row of db.recs.orders) {
    if (!row.customer?.trim()) throw new Error("Add the customer name");
    const existing = row.id ? await findByKey(Order, row.id) : null;
    const product = row.product ? await Product.findOne({ name: row.product }).lean() : null;
    const qty = Math.max(1, Math.round(Number(row.qty) || 1));
    const totalPaise = paise(row.total) || (product ? product.pricePaise * qty : 0);
    const unit = qty ? Math.round(totalPaise / qty) : totalPaise;
    const items = product
      ? [
          {
            productId: product._id,
            name: product.name,
            slug: product.slug,
            sku: product.sku,
            unitPricePaise: unit,
            quantity: qty,
            imageUrl: product.images?.[0],
          },
        ]
      : existing?.get("items") || [];
    const set = {
      studioKey: existing?.get("studioKey") || row.id,
      studio: row,
      status: orderStatusIn(row.status),
      guestEmail: row.customer.includes("@") ? row.customer.toLowerCase() : undefined,
      items,
      subtotalPaise: totalPaise,
      totalPaise,
      currency: "INR",
      paymentMethod: "cod" as const,
      notes: row.note || "",
      shipping: existing?.get("shipping") || {
        fullName: row.customer.trim(),
        phone: "0000000000",
        line1: "Recorded in admin",
        city: "Hyderabad",
        state: "Telangana",
        postalCode: "500001",
        country: "India",
      },
      ...(existing
        ? {}
        : {
            invoiceNumber: `AD${randomBytes(4).toString("hex").toUpperCase()}`,
          }),
    };
    if (existing) await Order.updateOne({ _id: existing._id }, { $set: set });
    else await Order.create(set);
  }
}

async function syncInquiries(db: StudioDb) {
  const known = db.known.inquiries.length ? db.known.inquiries : db.recs.inquiries.map((r) => r.id);
  await removeMissing(known, db.recs.inquiries.map((r) => r.id), async (id) => {
    const doc = await findByKey(BulkInquiry, id);
    if (doc) await BulkInquiry.deleteOne({ _id: doc._id });
  });
  for (const row of db.recs.inquiries) {
    if (!row.company?.trim()) throw new Error("Add the company");
    const existing = row.id ? await findByKey(BulkInquiry, row.id) : null;
    const contact = (row.contact || "").trim();
    const email = contact.includes("@") ? contact.toLowerCase() : `inquiry-${row.id}@prisbo.local`;
    const phone = contact.includes("@") ? "0000000000" : contact || "0000000000";
    const set = {
      studioKey: existing?.get("studioKey") || row.id,
      studio: row,
      company: row.company.trim(),
      contactName: row.company.trim(),
      email,
      phone: phone.slice(0, 15),
      productInterest: row.product || "",
      quantity: Math.max(1, Math.round(Number(row.qty) || 1)),
      notes: (row.note || "").slice(0, 1000),
      status: inquiryStatusIn(row.status),
    };
    if (existing) await BulkInquiry.updateOne({ _id: existing._id }, { $set: set });
    else await BulkInquiry.create(set);
  }
}

async function syncReviews(db: StudioDb, _actorId: string) {
  const known = db.known.reviews.length ? db.known.reviews : db.recs.reviews.map((r) => r.id);
  await removeMissing(known, db.recs.reviews.map((r) => r.id), async (id) => {
    const doc = await findByKey(Review, id);
    if (doc) await Review.deleteOne({ _id: doc._id });
  });
  for (const row of db.recs.reviews) {
    if (!row.customer?.trim() && !row.product?.trim()) throw new Error("Fill in the first field");
    const existing = row.id ? await findByKey(Review, row.id) : null;
    const product = row.product ? await Product.findOne({ name: row.product }).select("_id").lean() : null;
    if (!existing && !product) throw new Error("Choose a product that exists");
    const status = row.status;
    const set = {
      studioKey: existing?.get("studioKey") || row.id,
      studio: row,
      ...(product ? { productId: product._id } : {}),
      guestName: row.customer || "Customer",
      rating: Math.min(5, Math.max(1, Math.round(Number(row.rating) || 5))),
      body: (row.note || "Review").trim() || "Review",
      title: "",
      isApproved: status === "Approved",
      isRejected: status === "Hidden",
    };
    if (existing) await Review.updateOne({ _id: existing._id }, { $set: set });
    else await Review.create(set);
  }
}

async function syncUsers(db: StudioDb, actorId: string) {
  const known = db.known.users.length ? db.known.users : db.recs.users.map((r) => r.id);
  const live = new Set(db.recs.users.map((r) => r.id));
  for (const id of known) {
    if (live.has(id)) continue;
    const doc = await findByKey(User, id);
    if (!doc) continue;
    if (String(doc._id) === actorId) throw new Error("You can’t remove your own account");
    await User.deleteOne({ _id: doc._id });
  }
  for (const row of db.recs.users) {
    if (!row.name?.trim()) throw new Error("Add a name");
    const email = (row.email || "").trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Add a valid email");
    const existing = row.id ? await findByKey(User, row.id) : null;
    const duplicate = await User.findOne({ email, ...(existing ? { _id: { $ne: existing._id } } : {}) }).select("_id");
    if (duplicate) throw new Error("That email is already in use");
    const isAdmin = row.role !== "Staff";
    if (existing && String(existing._id) === actorId && (row.status === "Disabled" || !isAdmin)) {
      throw new Error("Keep your own account as an active admin");
    }
    const set = {
      name: row.name.trim(),
      email,
      role: isAdmin ? "admin" : "customer",
      teamRole: isAdmin ? "admin" : "staff",
      disabled: row.status === "Disabled",
      studioKey: existing?.get("studioKey") || row.id,
    };
    if (existing) await User.updateOne({ _id: existing._id }, { $set: set });
    else {
      await User.create({
        ...set,
        passwordHash: await bcrypt.hash(randomBytes(18).toString("hex"), 12),
        emailVerified: true,
      });
    }
  }
}
