/**
 * Seed catalog + optional admin user. Images: Unsplash (royalty-free).
 * Run: npm run seed
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Category } from "../src/lib/models/Category";
import { Subcategory } from "../src/lib/models/Subcategory";
import { Product } from "../src/lib/models/Product";
import { User } from "../src/lib/models/User";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI missing");
  process.exit(1);
}


/** Compact image helper — topic-matched Unsplash photos */
const u = (id: string, sig?: string) =>
  `https://images.unsplash.com/${id}${sig ? `?${sig}` : "?w=900&q=80"}`;

const categories = [
  {
    name: "Paper & Packaging",
    slug: "paper-packaging",
    description:
      "Low-cost, high-volume print — wrappers, labels, tissue kits, and event stationery.",
    sortOrder: 1,
    images: [u("photo-1549465220-1a8b9238cd48")],
    imageUrl: u("photo-1549465220-1a8b9238cd48"),
  },
  {
    name: "Acrylic & Resin",
    slug: "acrylic-resin",
    description:
      "Premium UV-printed acrylic — keychains, plaques, cake toppers, and desk accents.",
    sortOrder: 2,
    images: [u("photo-1582719478250-c89cae4dc85b")],
    imageUrl: u("photo-1582719478250-c89cae4dc85b"),
  },
  {
    name: "Stationery & Desk",
    slug: "stationery-desk",
    description:
      "Journals, organizers, and desk accessories for students and professionals.",
    sortOrder: 3,
    images: [u("photo-1513542789411-b6a5d4f31634")],
    imageUrl: u("photo-1513542789411-b6a5d4f31634"),
  },
  {
    name: "Home Decor & Lifestyle",
    slug: "home-decor-lifestyle",
    description:
      "Photo magnets, Polaroid-style print sets, and coasters for everyday spaces.",
    sortOrder: 4,
    images: [u("photo-1586023492125-27b2c045efd7")],
    imageUrl: u("photo-1586023492125-27b2c045efd7"),
  },
  {
    name: "Textiles & Apparel",
    slug: "textiles-apparel",
    description: "Sublimation gifts — cushions, mugs, caps, and tees for teams & brands.",
    sortOrder: 5,
    images: [u("photo-1615876234886-fd9a39fb97a0")],
    imageUrl: u("photo-1615876234886-fd9a39fb97a0"),
  },
];

type SeedProduct = {
  sku: string;
  slug: string;
  name: string;
  description: string;
  pricePaise: number;
  stock: number;
  images: string[];
  tags: string[];
};

type SubSeed = {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  images?: string[];
  products: SeedProduct[];
};

/** Flat list (legacy shape) — grouped into subcategories below */
const byCat: Record<string, SeedProduct[]> = {
  "paper-packaging": [
    {
      sku: "PAPR-CHOC-001",
      slug: "custom-chocolate-wrappers",
      name: "Custom Chocolate Bar Wrappers",
      description:
        "Foil-backed or paper wrappers for birthdays, weddings, and corporate gifting. Upload your artwork or we design for you.",
      pricePaise: 14900,
      stock: 500,
      images: [
        u("photo-1511381939415-e44015466834"),
        u("photo-1481391319762-47dea729e417"),
      ],
      tags: ["chocolate", "wrappers", "events"],
    },
    {
      sku: "PAPR-STK-002",
      slug: "logo-stickers-thank-you-labels",
      name: "Logo Stickers & Thank-you Labels",
      description:
        "Vinyl or paper stickers for packaging — logo rounds, thank-you seals, and QR promos.",
      pricePaise: 8900,
      stock: 800,
      images: [u("photo-1611532736597-de2d42653fba"), u("photo-1586953208448-b95a79798f07")],
      tags: ["stickers", "labels", "small-business"],
    },
    {
      sku: "PAPR-TIS-003",
      slug: "branded-tissue-paper-kit",
      name: "Branded Tissue Paper Kit",
      description:
        "Tissue sets for local sellers — brand color tissue + sticker bundle for unboxing moments.",
      pricePaise: 19900,
      stock: 300,
      images: [u("photo-1513201097305-4fa07f0f1b58"), u("photo-1607344645866-009c320b63e0")],
      tags: ["tissue", "packaging", "kits"],
    },
    {
      sku: "PAPR-BTL-004",
      slug: "wine-water-bottle-labels",
      name: "Wine & Water Bottle Labels",
      description:
        "Waterproof labels for parties, weddings, and corporate events — die-cut to bottle shape.",
      pricePaise: 12900,
      stock: 400,
      images: [u("photo-1510812431401-41d2bd2722f3"), u("photo-1553361371-9b22f78e8b1d")],
      tags: ["bottles", "events", "labels"],
    },
    {
      sku: "PAPR-CAL-005",
      slug: "tear-off-desk-calendars",
      name: "Tear-off Mini Desk Calendars",
      description:
        "Mini calendars with your photos — perfect desk gifts and client year-end bundles.",
      pricePaise: 24900,
      stock: 200,
      images: [u("photo-1506784365847-b57d9413d566"), u("photo-1434030216411-0b793f4b4173")],
      tags: ["calendar", "desk", "photos"],
    },
  ],
  "acrylic-resin": [
    {
      sku: "ACRY-KEY-001",
      slug: "spotify-style-acrylic-keychain",
      name: "Spotify-style Acrylic Keychain",
      description:
        "Scannable song-code style keychains — crystal clear acrylic with UV print.",
      pricePaise: 39900,
      stock: 250,
      images: [u("photo-1590874103328-eac38a683ce7"), u("photo-1522312346375-d1e52e2b99b3")],
      tags: ["keychain", "spotify", "gift"],
    },
    {
      sku: "ACRY-PLQ-002",
      slug: "acrylic-desk-plaque-led-base",
      name: "Acrylic Desk Plaque (LED Base Option)",
      description:
        '"Glass look" plaque with wooden or LED base — awards, quotes, and brand signage.',
      pricePaise: 129900,
      stock: 80,
      images: [u("photo-1567427017947-545c5f8d16ad"), u("photo-1517245386807-bb43f82c33c4")],
      tags: ["plaque", "led", "office"],
    },
    {
      sku: "ACRY-CAKE-003",
      slug: "personalized-acrylic-cake-topper",
      name: "Personalized Acrylic Cake Topper",
      description:
        "Mirror, glitter, or clear finishes — names, ages, and monograms for celebrations.",
      pricePaise: 59900,
      stock: 150,
      images: [u("photo-1464349095431-e9a21285b5f3"), u("photo-1535254973040-607b474ea50c")],
      tags: ["cake", "wedding", "party"],
    },
    {
      sku: "ACRY-TAG-004",
      slug: "custom-acrylic-bag-tags",
      name: "Custom Acrylic Bag Tags",
      description:
        "Durable tags for school bags and luggage — bright colors and bold names.",
      pricePaise: 34900,
      stock: 220,
      images: [u("photo-1553062407-98eeb64c6a62"), u("photo-1565026057447-bc90a3dceb87")],
      tags: ["luggage", "kids", "travel"],
    },
    {
      sku: "ACRY-NAM-005",
      slug: "acrylic-name-plate-desk-door",
      name: "Acrylic Name Plate — Desk or Door",
      description:
        "Professional desk wedges and door plates — frosted or clear with precision UV text.",
      pricePaise: 79900,
      stock: 120,
      images: [u("photo-1497215842964-222b430dc094"), u("photo-1524758631624-e2822e304c36")],
      tags: ["name-plate", "office", "home"],
    },
    {
      sku: "ACRY-MAG-006",
      slug: "acrylic-fridge-magnets",
      name: "Acrylic Fridge Magnets",
      description:
        "Rigid clear magnets with your photos — premium alternative to flexible sheets.",
      pricePaise: 29900,
      stock: 300,
      images: [u("photo-1571902943202-507ec2618e8f"), u("photo-1582735689369-4fe89db7114c")],
      tags: ["magnets", "photos", "kitchen"],
    },
  ],
  "stationery-desk": [
    {
      sku: "STAT-JRN-001",
      slug: "personalized-leatherette-journal",
      name: "Personalized Journal / Notebook",
      description:
        "Debossed or printed covers with names — dot, lined, or blank interiors.",
      pricePaise: 69900,
      stock: 180,
      images: [u("photo-1544816155-12dbf7329eb2"), u("photo-1512820790803-83ca734da794")],
      tags: ["journal", "notebook", "gift"],
    },
    {
      sku: "STAT-BMK-002",
      slug: "photo-bookmark-silk-tassel",
      name: "Photo Bookmark with Silk Tassel",
      description:
        "Metal or cardstock bookmarks with your photo and optional quote — silk tassel finish.",
      pricePaise: 24900,
      stock: 400,
      images: [u("photo-1506883910386-79dacab61d2d"), u("photo-1524995997946-a1c2e315a42f")],
      tags: ["bookmark", "reading", "gift"],
    },
    {
      sku: "STAT-ORG-003",
      slug: "personalized-desk-organizer",
      name: "Personalized Desk Organizer",
      description:
        "MDF or acrylic organizers engraved with a name — pens, phones, and notes in one place.",
      pricePaise: 89900,
      stock: 90,
      images: [u("photo-1497366216548-37526070297c"), u("photo-1593640408182-31ccc728baf7")],
      tags: ["organizer", "desk", "wfh"],
    },
    {
      sku: "STAT-MSE-004",
      slug: "custom-photo-mousepad",
      name: "Custom Photo Mousepad",
      description:
        "Smooth fabric top with non-slip base — family photos or workspace aesthetics.",
      pricePaise: 44900,
      stock: 350,
      images: [u("photo-1593640408182-31ccc728baf7"), u("photo-1527864550417-7fd91fc2a46e")],
      tags: ["mousepad", "desk", "photo"],
    },
    {
      sku: "STAT-PEN-005",
      slug: "laser-engraved-metal-bamboo-pen",
      name: "Laser-engraved Custom Pens",
      description:
        "Metal or bamboo barrels with precision laser names — great for corporate gifting.",
      pricePaise: 34900,
      stock: 500,
      images: [u("photo-1585336261022-68180d7c14c9"), u("photo-1565610222536-ef125c59da2e")],
      tags: ["pen", "engraving", "corporate"],
    },
  ],
  "home-decor-lifestyle": [
    {
      sku: "HOME-MAG-001",
      slug: "flexible-photo-fridge-magnets",
      name: "Flexible Photo Fridge Magnets",
      description:
        "Sheet magnets printed with your photos — affordable and great for family collages.",
      pricePaise: 19900,
      stock: 600,
      images: [u("photo-1578662996442-48f60103fc96"), u("photo-1556910103-1c02745aae4d")],
      tags: ["magnets", "photos", "kitchen"],
    },
    {
      sku: "HOME-POL-002",
      slug: "polaroid-style-print-box-set",
      name: "Polaroid-style Print Box Set",
      description:
        "Sets of 10–20 mini prints in a custom keepsake box — wedding and baby milestones.",
      pricePaise: 79900,
      stock: 140,
      images: [u("photo-1526170375885-4d8ecf77b99f"), u("photo-1493863641943-9b68992a8d28")],
      tags: ["polaroid", "prints", "gift-box"],
    },
    {
      sku: "HOME-CST-003",
      slug: "custom-wood-cork-acrylic-coasters",
      name: "Custom Coasters — Wood, Cork, or Acrylic",
      description:
        "Laser-engraved or UV-printed coasters — monograms, maps, and brand marks.",
      pricePaise: 54900,
      stock: 260,
      images: [u("photo-1509440159529-c21ea989e455"), u("photo-1558642452-9d2a7deb7f62")],
      tags: ["coasters", "home", "bar"],
    },
  ],
  "textiles-apparel": [
    {
      sku: "TEX-CUS-001",
      slug: "personalized-sequin-cushion",
      name: "Personalized Sequin & Photo Cushions",
      description:
        "Flip-sequin reveals or classic sublimation photo pillows — soft, vivid, washable covers.",
      pricePaise: 99900,
      stock: 160,
      images: [u("photo-1584100936591-c65d4534f48a"), u("photo-1616486338812-3dadae4b4ace")],
      tags: ["cushion", "sublimation", "gift"],
    },
    {
      sku: "TEX-MUG-002",
      slug: "custom-mug-travel-sipper",
      name: "Custom Mug & Travel Sipper",
      description:
        "Classic ceramic mugs and insulated sippers — full-wrap prints for teams and startups.",
      pricePaise: 44900,
      stock: 400,
      images: [u("photo-1514228742587-6b1558fcca3d"), u("photo-1495474475677-80d4226b1d4e")],
      tags: ["mug", "sipper", "sublimation"],
    },
    {
      sku: "TEX-TEE-003",
      slug: "branded-t-shirts-startups",
      name: "Branded T-shirts",
      description:
        "Cotton-blend tees with vibrant sublimation or DTF — great for startups and sports teams.",
      pricePaise: 69900,
      stock: 220,
      images: [u("photo-1521572163474-6864f9cf17ab"), u("photo-1503341504253-dff4815485f1")],
      tags: ["tshirt", "apparel", "teams"],
    },
    {
      sku: "TEX-CAP-004",
      slug: "branded-caps-teams",
      name: "Branded Caps",
      description:
        "Structured caps with embroidered or printed logos — batch-friendly for local leagues.",
      pricePaise: 54900,
      stock: 180,
      images: [u("photo-1588850561407-ed78c886e0b4"), u("photo-1521369908759-2f4ee4776204")],
      tags: ["cap", "headwear", "teams"],
    },
  ],
};

const catalog: Record<string, SubSeed[]> = {
  "paper-packaging": [
    {
      name: "Confectionery & bar wraps",
      slug: "confectionery-wraps",
      description: "Chocolate and candy wraps for parties, weddings, and retail.",
      sortOrder: 1,
      images: [byCat["paper-packaging"][0].images[0]],
      products: [byCat["paper-packaging"][0]],
    },
    {
      name: "Stickers & seals",
      slug: "stickers-seals",
      description: "Logo stickers, thank-you seals, and promo labels.",
      sortOrder: 2,
      images: [byCat["paper-packaging"][1].images[0]],
      products: [byCat["paper-packaging"][1]],
    },
    {
      name: "Tissue & unboxing kits",
      slug: "tissue-kits",
      description: "Branded tissue and packaging kits for sellers.",
      sortOrder: 3,
      images: [byCat["paper-packaging"][2].images[0]],
      products: [byCat["paper-packaging"][2]],
    },
    {
      name: "Bottle & beverage labels",
      slug: "bottle-labels",
      description: "Event and corporate labels for bottles.",
      sortOrder: 4,
      images: [byCat["paper-packaging"][3].images[0]],
      products: [byCat["paper-packaging"][3]],
    },
    {
      name: "Calendars & desk gifts",
      slug: "calendars-desk",
      description: "Photo calendars and tear-off desk pads.",
      sortOrder: 5,
      images: [byCat["paper-packaging"][4].images[0]],
      products: [byCat["paper-packaging"][4]],
    },
  ],
  "acrylic-resin": [
    {
      name: "Travel & everyday carry",
      slug: "travel-carry",
      description: "Keychains and bag tags in crystal-clear acrylic.",
      sortOrder: 1,
      images: [byCat["acrylic-resin"][0].images[0]],
      products: [byCat["acrylic-resin"][0], byCat["acrylic-resin"][3]],
    },
    {
      name: "Desk & office signage",
      slug: "desk-office",
      description: "Plaques, LED bases, and name plates.",
      sortOrder: 2,
      images: [byCat["acrylic-resin"][1].images[0]],
      products: [byCat["acrylic-resin"][1], byCat["acrylic-resin"][4]],
    },
    {
      name: "Parties & celebrations",
      slug: "parties",
      description: "Cake toppers and event accents.",
      sortOrder: 3,
      images: [byCat["acrylic-resin"][2].images[0]],
      products: [byCat["acrylic-resin"][2]],
    },
    {
      name: "Acrylic magnets",
      slug: "acrylic-magnets",
      description: "Rigid photo magnets for fridges and lockers.",
      sortOrder: 4,
      images: [byCat["acrylic-resin"][5].images[0]],
      products: [byCat["acrylic-resin"][5]],
    },
  ],
  "stationery-desk": [
    {
      name: "Writing & reading",
      slug: "writing-reading",
      description: "Journals, bookmarks, and engraved pens.",
      sortOrder: 1,
      images: [byCat["stationery-desk"][0].images[0]],
      products: [
        byCat["stationery-desk"][0],
        byCat["stationery-desk"][1],
        byCat["stationery-desk"][4],
      ],
    },
    {
      name: "Desk organizers & surfaces",
      slug: "desk-surfaces",
      description: "Organizers and custom mousepads.",
      sortOrder: 2,
      images: [byCat["stationery-desk"][2].images[0]],
      products: [byCat["stationery-desk"][2], byCat["stationery-desk"][3]],
    },
  ],
  "home-decor-lifestyle": [
    {
      name: "Photos & magnets",
      slug: "photos-magnets",
      description: "Flexible magnets and Polaroid-style print sets.",
      sortOrder: 1,
      images: [byCat["home-decor-lifestyle"][0].images[0]],
      products: [byCat["home-decor-lifestyle"][0], byCat["home-decor-lifestyle"][1]],
    },
    {
      name: "Coasters & table",
      slug: "coasters-table",
      description: "Custom coasters in wood, cork, or acrylic.",
      sortOrder: 2,
      images: [byCat["home-decor-lifestyle"][2].images[0]],
      products: [byCat["home-decor-lifestyle"][2]],
    },
  ],
  "textiles-apparel": [
    {
      name: "Cushions & soft gifts",
      slug: "cushions",
      description: "Photo and sequin cushions.",
      sortOrder: 1,
      images: [byCat["textiles-apparel"][0].images[0]],
      products: [byCat["textiles-apparel"][0]],
    },
    {
      name: "Mugs & drinkware",
      slug: "mugs-drinkware",
      description: "Ceramic mugs and travel sippers.",
      sortOrder: 2,
      images: [byCat["textiles-apparel"][1].images[0]],
      products: [byCat["textiles-apparel"][1]],
    },
    {
      name: "Apparel",
      slug: "apparel",
      description: "T-shirts and caps for teams and brands.",
      sortOrder: 3,
      images: [byCat["textiles-apparel"][2].images[0]],
      products: [byCat["textiles-apparel"][2], byCat["textiles-apparel"][3]],
    },
  ],
};

async function seedAdminUser(required: boolean) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
  const adminPass = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPass) {
    if (required) {
      console.error(
        "Admin-only mode: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local"
      );
      process.exit(1);
    }
    console.log("Skip admin seed (set SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD in .env.local)");
    return;
  }
  const hash = await bcrypt.hash(adminPass, 12);
  await User.findOneAndUpdate(
    { email: adminEmail.toLowerCase() },
    {
      $set: {
        email: adminEmail.toLowerCase(),
        passwordHash: hash,
        name: "Prisbo Admin",
        role: "admin",
      },
    },
    { upsert: true }
  );
  console.log(`Admin upserted: ${adminEmail}`);
}

function isAdminOnlySeed(): boolean {
  return (
    process.argv.includes("--admin-only") ||
    process.env.SEED_ADMIN_ONLY === "1" ||
    process.env.SEED_ADMIN_ONLY === "true"
  );
}

async function main() {
  await mongoose.connect(uri);

  if (isAdminOnlySeed()) {
    console.log("Connected. Admin-only: upserting user (catalog unchanged)…");
    await seedAdminUser(true);
    console.log("Done.");
    await mongoose.disconnect();
    return;
  }

  console.log("Connected. Clearing catalog…");
  await Product.deleteMany({});
  await Subcategory.deleteMany({});
  await Category.deleteMany({});

  const catMap = new Map<string, mongoose.Types.ObjectId>();
  for (const c of categories) {
    const doc = await Category.create(c);
    catMap.set(c.slug, doc._id);
  }

  for (const [catSlug, subs] of Object.entries(catalog)) {
    const cid = catMap.get(catSlug);
    if (!cid) continue;
    for (const sub of subs) {
      const subImages = sub.images?.length ? sub.images : [];
      const sdoc = await Subcategory.create({
        categoryId: cid,
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        sortOrder: sub.sortOrder,
        images: subImages,
        imageUrl: subImages[0],
      });
      for (const p of sub.products) {
        await Product.create({
          subcategoryId: sdoc._id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          pricePaise: p.pricePaise,
          sku: p.sku,
          stock: p.stock,
          images: p.images,
          tags: p.tags,
          isActive: true,
          currency: "INR",
        });
      }
    }
  }

  await seedAdminUser(false);

  console.log("Seed complete.");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
