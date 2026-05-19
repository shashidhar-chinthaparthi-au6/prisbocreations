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
import { SchemaField } from "../src/lib/models/SchemaField";
import { User } from "../src/lib/models/User";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("MONGODB_URI missing");
  process.exit(1);
}

/** Build an Unsplash image URL with width + quality */
const u = (id: string) => `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
const categories = [
  {
    name: "Photo Frames & Prints",
    slug: "photo-frames",
    description: "Personalized photo frames, canvas prints, and wall art to display your precious memories.",
    sortOrder: 1,
    images: [
      u("photo-1558618666-fcd25c85cd64"),
      u("photo-1531346878377-a5be20888e57"),
      u("photo-1516455207990-7a41ce80f7ee"),
    ],
    imageUrl: u("photo-1558618666-fcd25c85cd64"),
  },
  {
    name: "Mugs & Drinkware",
    slug: "mugs",
    description: "Custom photo mugs, magic mugs, and travel sippers for everyday gifting.",
    sortOrder: 2,
    images: [
      u("photo-1514228742587-6b1558fcca3d"),
      u("photo-1495474475677-80d4226b1d4e"),
      u("photo-1572116469696-31de0f17cc34"),
    ],
    imageUrl: u("photo-1514228742587-6b1558fcca3d"),
  },
  {
    name: "Cushions & Pillows",
    slug: "cushions",
    description: "Photo cushions, sequin pillows, and personalized soft gifts for home decor.",
    sortOrder: 3,
    images: [
      u("photo-1584100936591-c65d4534f48a"),
      u("photo-1616486338812-3dadae4b4ace"),
      u("photo-1540574163026-643ea20ade25"),
    ],
    imageUrl: u("photo-1584100936591-c65d4534f48a"),
  },
  {
    name: "Keychains & Accessories",
    slug: "keychains",
    description: "Acrylic keychains, photo keychains, and personalized accessories.",
    sortOrder: 4,
    images: [
      u("photo-1590874103328-eac38a683ce7"),
      u("photo-1578915266302-4c44cd2a89ae"),
      u("photo-1522312346375-d1e52e2b99b3"),
    ],
    imageUrl: u("photo-1590874103328-eac38a683ce7"),
  },
  {
    name: "Gift Sets & Hampers",
    slug: "gift-sets",
    description: "Curated gift hampers and combo sets for birthdays, anniversaries, and corporate gifting.",
    sortOrder: 5,
    images: [
      u("photo-1549465220-1a8b9238cd48"),
      u("photo-1607344645866-009c320b63e0"),
      u("photo-1513201097305-4fa07f0f1b58"),
    ],
    imageUrl: u("photo-1549465220-1a8b9238cd48"),
  },
  {
    name: "Wall Art & Décor",
    slug: "wall-art",
    description: "Canvas prints, posters, acrylic plaques, and personalized home décor pieces.",
    sortOrder: 6,
    images: [
      u("photo-1558618666-fcd25c85cd64"),
      u("photo-1567427017947-545c5f8d16ad"),
      u("photo-1497366216548-37526070297c"),
    ],
    imageUrl: u("photo-1558618666-fcd25c85cd64"),
  },
];

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------
type ColourVariant = {
  displayName: string;
  hexCode: string;
  skuSuffix: string;
  basePrice: number;
  mrp: number;
  isActive: boolean;
  displayOrder: number;
  images: { url: string; isPrimary: boolean; displayOrder: number }[];
};

type SeedProduct = {
  sku: string;
  slug: string;
  name: string;
  description: string;
  pricePaise: number;
  compareAtPaise?: number;
  stock: number;
  images: string[];
  tags: string[];
  featured?: boolean;
  recipients?: string[];
  allowCustomerCustomization?: boolean;
  customizationTextLabel?: string;
  customizationTextPlaceholder?: string;
  customizationTextRequired?: boolean;
  customizationImageRequired?: boolean;
  colourVariants?: ColourVariant[];
  weightKg?: number;
};

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
const products: Record<string, SeedProduct[]> = {

  // ── Photo Frames ─────────────────────────────────────────────────────────
  "photo-frames": [
    {
      sku: "PF-001",
      slug: "personalized-wooden-photo-frame",
      name: "Personalized Wooden Photo Frame",
      description: "<p>A beautifully crafted wooden frame engraved with your name, date, or message. Perfect for anniversaries, birthdays, and housewarmings.</p><ul><li>Natural mango wood finish</li><li>Laser-engraved personalization</li><li>Holds 4×6\" or 5×7\" photos</li><li>Stands upright or hangs on wall</li></ul>",
      pricePaise: 79900,
      compareAtPaise: 99900,
      stock: 120,
      featured: true,
      recipients: ["her", "him", "couples"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Text to engrave (name, date, or message)",
      customizationTextPlaceholder: "e.g. Priya & Rohan | 14 Feb 2024",
      customizationTextRequired: true,
      customizationImageRequired: false,
      images: [
        u("photo-1558618666-fcd25c85cd64"),
        u("photo-1531346878377-a5be20888e57"),
        u("photo-1516455207990-7a41ce80f7ee"),
        u("photo-1513519245088-0e12902e5a38"),
        u("photo-1581591524425-c7e0978865fc"),
      ],
      tags: ["frame", "wood", "anniversary", "personalized"],
    },
    {
      sku: "PF-002",
      slug: "couple-collage-photo-frame",
      name: "Couple Collage Photo Frame",
      description: "<p>A stunning collage frame for couples — fits 4–6 photos with a romantic layout. Ideal as a Valentine's Day or anniversary gift.</p><ul><li>High-quality MDF with gloss finish</li><li>Custom text at bottom</li><li>Multiple photo slots</li><li>Gift-ready packaging</li></ul>",
      pricePaise: 129900,
      compareAtPaise: 159900,
      stock: 80,
      featured: true,
      recipients: ["her", "couples"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Caption (names or message)",
      customizationTextPlaceholder: "e.g. Forever & Always",
      customizationTextRequired: false,
      customizationImageRequired: true,
      images: [
        u("photo-1519682337058-a94d519337bc"),
        u("photo-1481627834876-b7833e8f5570"),
        u("photo-1456513080510-7bf3a84b82f8"),
        u("photo-1524995997946-a1c2e315a42f"),
      ],
      tags: ["collage", "couple", "valentine", "anniversary"],
    },
    {
      sku: "PF-003",
      slug: "canvas-photo-print",
      name: "Premium Canvas Photo Print",
      description: "<p>Turn your favorite photo into a gallery-quality canvas print. Museum-grade inks, thick 1.5\" frame — ready to hang.</p><ul><li>300 GSM artist canvas</li><li>UV-resistant inks</li><li>Available in multiple sizes</li><li>Arrives ready to hang</li></ul>",
      pricePaise: 149900,
      compareAtPaise: 199900,
      stock: 60,
      featured: false,
      recipients: ["her", "him", "couples", "kids"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Custom caption (optional)",
      customizationTextPlaceholder: "e.g. Our Happy Place",
      customizationTextRequired: false,
      customizationImageRequired: true,
      images: [
        u("photo-1578662996442-48f60103fc96"),
        u("photo-1526506118085-60ce8714f8c5"),
        u("photo-1516455207990-7a41ce80f7ee"),
        u("photo-1506905925346-21bda4d32df4"),
      ],
      tags: ["canvas", "print", "wall-art", "photo"],
    },
    {
      sku: "PF-004",
      slug: "family-name-photo-frame",
      name: "Family Name Photo Frame",
      description: "<p>A heartwarming family frame that spells out your family name in bold letters, with photo slots for each member.</p><ul><li>Natural pine wood</li><li>Laser-cut 3D letters</li><li>Holds 3–5 family photos</li><li>Handcrafted finish</li></ul>",
      pricePaise: 169900,
      stock: 40,
      recipients: ["her", "him", "kids", "couples"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Family surname",
      customizationTextPlaceholder: "e.g. The Sharma Family",
      customizationTextRequired: true,
      customizationImageRequired: false,
      images: [
        u("photo-1513542789411-b6a5d4f31634"),
        u("photo-1534435493923-4ce4cc4b4e06"),
        u("photo-1581591524425-c7e0978865fc"),
        u("photo-1558618666-fcd25c85cd64"),
      ],
      tags: ["family", "frame", "wood", "personalized"],
    },
  ],

  // ── Mugs & Drinkware ─────────────────────────────────────────────────────
  "mugs": [
    {
      sku: "MUG-001",
      slug: "personalized-photo-mug",
      name: "Personalized Photo Mug",
      description: "<p>Start every morning with a smile — your favorite photo printed on a premium ceramic mug. Dishwasher-safe and fade-resistant.</p><ul><li>11oz white ceramic</li><li>Full-wrap photo print</li><li>Dishwasher & microwave safe</li><li>Add your photo + optional text</li></ul>",
      pricePaise: 44900,
      compareAtPaise: 59900,
      stock: 300,
      featured: true,
      recipients: ["her", "him", "couples", "kids", "corporate"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Caption / name to print",
      customizationTextPlaceholder: "e.g. World's Best Dad ❤️",
      customizationTextRequired: false,
      customizationImageRequired: true,
      colourVariants: [
        {
          displayName: "Classic White",
          hexCode: "#FFFFFF",
          skuSuffix: "WHT",
          basePrice: 44900,
          mrp: 59900,
          isActive: true,
          displayOrder: 0,
          images: [
            { url: u("photo-1514228742587-6b1558fcca3d"), isPrimary: true, displayOrder: 0 },
            { url: u("photo-1495474475677-80d4226b1d4e"), isPrimary: false, displayOrder: 1 },
          ],
        },
        {
          displayName: "Midnight Black",
          hexCode: "#1A1A1A",
          skuSuffix: "BLK",
          basePrice: 49900,
          mrp: 64900,
          isActive: true,
          displayOrder: 1,
          images: [
            { url: u("photo-1572116469696-31de0f17cc34"), isPrimary: true, displayOrder: 0 },
            { url: u("photo-1455090392996-5e285c89ef2b"), isPrimary: false, displayOrder: 1 },
          ],
        },
        {
          displayName: "Pastel Pink",
          hexCode: "#F9C5D1",
          skuSuffix: "PNK",
          basePrice: 49900,
          mrp: 64900,
          isActive: true,
          displayOrder: 2,
          images: [
            { url: u("photo-1607344645866-009c320b63e0"), isPrimary: true, displayOrder: 0 },
            { url: u("photo-1513201097305-4fa07f0f1b58"), isPrimary: false, displayOrder: 1 },
          ],
        },
      ],
      images: [
        u("photo-1514228742587-6b1558fcca3d"),
        u("photo-1495474475677-80d4226b1d4e"),
        u("photo-1572116469696-31de0f17cc34"),
        u("photo-1455090392996-5e285c89ef2b"),
        u("photo-1607344645866-009c320b63e0"),
      ],
      tags: ["mug", "ceramic", "photo", "gift"],
    },
    {
      sku: "MUG-002",
      slug: "magic-color-changing-mug",
      name: "Magic Color-Changing Photo Mug",
      description: "<p>Pour in a hot drink and watch your hidden photo appear! A fun and surprising gift for friends and family.</p><ul><li>Heat-sensitive coating</li><li>Photo hidden when cold</li><li>Reveals with hot liquids</li><li>Perfect surprise gift</li></ul>",
      pricePaise: 64900,
      compareAtPaise: 84900,
      stock: 150,
      featured: true,
      recipients: ["her", "him", "couples", "kids"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Secret message (optional)",
      customizationTextPlaceholder: "e.g. I Love You!",
      customizationTextRequired: false,
      customizationImageRequired: true,
      images: [
        u("photo-1514228742587-6b1558fcca3d"),
        u("photo-1578662996442-48f60103fc96"),
        u("photo-1495474475677-80d4226b1d4e"),
        u("photo-1556910103-1c02745aae4d"),
      ],
      tags: ["magic-mug", "color-changing", "surprise", "photo"],
    },
    {
      sku: "MUG-003",
      slug: "custom-travel-sipper-bottle",
      name: "Custom Photo Travel Sipper",
      description: "<p>Stay hydrated in style with your photo on a premium stainless steel sipper. Keeps drinks cold 24 hrs, hot 12 hrs.</p><ul><li>500ml double-wall insulated</li><li>BPA-free stainless steel</li><li>Leak-proof lid</li><li>Full-wrap sublimation print</li></ul>",
      pricePaise: 89900,
      compareAtPaise: 119900,
      stock: 100,
      featured: false,
      recipients: ["him", "corporate", "kids"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Name or text to print",
      customizationTextPlaceholder: "e.g. Rahul's Coffee",
      customizationTextRequired: false,
      customizationImageRequired: false,
      colourVariants: [
        {
          displayName: "Silver",
          hexCode: "#C0C0C0",
          skuSuffix: "SLV",
          basePrice: 89900,
          mrp: 119900,
          isActive: true,
          displayOrder: 0,
          images: [
            { url: u("photo-1572116469696-31de0f17cc34"), isPrimary: true, displayOrder: 0 },
          ],
        },
        {
          displayName: "Rose Gold",
          hexCode: "#B76E79",
          skuSuffix: "RSG",
          basePrice: 94900,
          mrp: 124900,
          isActive: true,
          displayOrder: 1,
          images: [
            { url: u("photo-1607344645866-009c320b63e0"), isPrimary: true, displayOrder: 0 },
          ],
        },
        {
          displayName: "Matte Black",
          hexCode: "#2D2D2D",
          skuSuffix: "MBK",
          basePrice: 94900,
          mrp: 124900,
          isActive: true,
          displayOrder: 2,
          images: [
            { url: u("photo-1455090392996-5e285c89ef2b"), isPrimary: true, displayOrder: 0 },
          ],
        },
      ],
      images: [
        u("photo-1572116469696-31de0f17cc34"),
        u("photo-1607344645866-009c320b63e0"),
        u("photo-1455090392996-5e285c89ef2b"),
        u("photo-1514228742587-6b1558fcca3d"),
      ],
      tags: ["sipper", "travel", "insulated", "photo"],
    },
    {
      sku: "MUG-004",
      slug: "couple-set-two-mugs",
      name: "Couple Mug Set (Set of 2)",
      description: "<p>His and Hers mug set — perfect for couples! Customize each mug with individual names and a sweet message.</p><ul><li>Set of 2 ceramic mugs</li><li>His & Hers design</li><li>Individual personalization</li><li>Gift box included</li></ul>",
      pricePaise: 79900,
      compareAtPaise: 99900,
      stock: 80,
      featured: false,
      recipients: ["couples", "her"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Names for Mug 1 & Mug 2",
      customizationTextPlaceholder: "e.g. Mug 1: Priya | Mug 2: Rohan",
      customizationTextRequired: true,
      customizationImageRequired: false,
      images: [
        u("photo-1495474475677-80d4226b1d4e"),
        u("photo-1514228742587-6b1558fcca3d"),
        u("photo-1455090392996-5e285c89ef2b"),
        u("photo-1572116469696-31de0f17cc34"),
      ],
      tags: ["couple", "mug-set", "his-hers", "gift"],
    },
  ],

  // ── Cushions & Pillows ───────────────────────────────────────────────────
  "cushions": [
    {
      sku: "CUS-001",
      slug: "personalized-photo-cushion",
      name: "Personalized Photo Cushion",
      description: "<p>A plush cushion printed with your most treasured photo. Soft, huggable, and beautifully vivid — a gift that says a thousand words.</p><ul><li>40×40 cm or 30×50 cm</li><li>Sublimation print on velvet/satin</li><li>Removable zippered cover</li><li>Comes with premium filler</li></ul>",
      pricePaise: 89900,
      compareAtPaise: 119900,
      stock: 160,
      featured: true,
      recipients: ["her", "him", "couples", "kids"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Caption to print below photo (optional)",
      customizationTextPlaceholder: "e.g. Forever in My Heart",
      customizationTextRequired: false,
      customizationImageRequired: true,
      colourVariants: [
        {
          displayName: "White Satin",
          hexCode: "#FAFAFA",
          skuSuffix: "WHT",
          basePrice: 89900,
          mrp: 119900,
          isActive: true,
          displayOrder: 0,
          images: [
            { url: u("photo-1584100936591-c65d4534f48a"), isPrimary: true, displayOrder: 0 },
            { url: u("photo-1616486338812-3dadae4b4ace"), isPrimary: false, displayOrder: 1 },
          ],
        },
        {
          displayName: "Velvet Black",
          hexCode: "#1A1A1A",
          skuSuffix: "BLK",
          basePrice: 94900,
          mrp: 124900,
          isActive: true,
          displayOrder: 1,
          images: [
            { url: u("photo-1540574163026-643ea20ade25"), isPrimary: true, displayOrder: 0 },
          ],
        },
        {
          displayName: "Blush Pink",
          hexCode: "#FFB6C1",
          skuSuffix: "PNK",
          basePrice: 94900,
          mrp: 124900,
          isActive: true,
          displayOrder: 2,
          images: [
            { url: u("photo-1586023492125-27b2c045efd7"), isPrimary: true, displayOrder: 0 },
          ],
        },
      ],
      images: [
        u("photo-1584100936591-c65d4534f48a"),
        u("photo-1616486338812-3dadae4b4ace"),
        u("photo-1540574163026-643ea20ade25"),
        u("photo-1586023492125-27b2c045efd7"),
        u("photo-1556910103-1c02745aae4d"),
      ],
      tags: ["cushion", "photo", "sublimation", "soft-gift"],
    },
    {
      sku: "CUS-002",
      slug: "sequin-flip-photo-cushion",
      name: "Sequin Flip Photo Cushion",
      description: "<p>Run your hand across this magical cushion to reveal your hidden photo! Gold-silver or rose-gold sequins make it a showstopper.</p><ul><li>Flip-sequin photo reveal</li><li>Reversible design</li><li>Super soft filling</li><li>40×40 cm</li></ul>",
      pricePaise: 119900,
      compareAtPaise: 149900,
      stock: 80,
      featured: true,
      recipients: ["her", "couples", "kids"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Caption (optional)",
      customizationTextPlaceholder: "e.g. My Sunshine",
      customizationTextRequired: false,
      customizationImageRequired: true,
      colourVariants: [
        {
          displayName: "Gold & Silver",
          hexCode: "#FFD700",
          skuSuffix: "GLD",
          basePrice: 119900,
          mrp: 149900,
          isActive: true,
          displayOrder: 0,
          images: [
            { url: u("photo-1584100936591-c65d4534f48a"), isPrimary: true, displayOrder: 0 },
          ],
        },
        {
          displayName: "Rose Gold",
          hexCode: "#B76E79",
          skuSuffix: "RSG",
          basePrice: 119900,
          mrp: 149900,
          isActive: true,
          displayOrder: 1,
          images: [
            { url: u("photo-1616486338812-3dadae4b4ace"), isPrimary: true, displayOrder: 0 },
          ],
        },
      ],
      images: [
        u("photo-1616486338812-3dadae4b4ace"),
        u("photo-1584100936591-c65d4534f48a"),
        u("photo-1540574163026-643ea20ade25"),
        u("photo-1586023492125-27b2c045efd7"),
      ],
      tags: ["sequin", "magic", "reveal", "cushion"],
    },
    {
      sku: "CUS-003",
      slug: "heart-shaped-photo-cushion",
      name: "Heart-Shaped Photo Cushion",
      description: "<p>A heart-shaped cushion brimming with love — print your favorite photo or couple portrait on this romantic gift.</p><ul><li>Heart silhouette cut</li><li>Premium sublimation print</li><li>Soft microfiber cover</li><li>Ideal for Valentine's Day & anniversaries</li></ul>",
      pricePaise: 99900,
      compareAtPaise: 129900,
      stock: 60,
      featured: false,
      recipients: ["her", "couples"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Sweet message (optional)",
      customizationTextPlaceholder: "e.g. You're My Person",
      customizationTextRequired: false,
      customizationImageRequired: true,
      images: [
        u("photo-1540574163026-643ea20ade25"),
        u("photo-1586023492125-27b2c045efd7"),
        u("photo-1584100936591-c65d4534f48a"),
        u("photo-1616486338812-3dadae4b4ace"),
      ],
      tags: ["heart", "cushion", "romantic", "valentine"],
    },
  ],

  // ── Keychains & Accessories ──────────────────────────────────────────────
  "keychains": [
    {
      sku: "KEY-001",
      slug: "acrylic-photo-keychain",
      name: "Acrylic Photo Keychain",
      description: "<p>Carry a memory wherever you go! Crystal-clear acrylic keychains printed with your photo or message. Great for gifting and bulk orders.</p><ul><li>Crystal-clear 5mm acrylic</li><li>UV-resistant photo print</li><li>Steel split ring + chain</li><li>Multiple shapes available</li></ul>",
      pricePaise: 29900,
      compareAtPaise: 39900,
      stock: 500,
      featured: true,
      recipients: ["her", "him", "kids", "couples", "corporate"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Name or text to print",
      customizationTextPlaceholder: "e.g. Best Friends Forever",
      customizationTextRequired: false,
      customizationImageRequired: false,
      colourVariants: [
        {
          displayName: "Round",
          hexCode: "#E8F4FD",
          skuSuffix: "RND",
          basePrice: 29900,
          mrp: 39900,
          isActive: true,
          displayOrder: 0,
          images: [
            { url: u("photo-1590874103328-eac38a683ce7"), isPrimary: true, displayOrder: 0 },
          ],
        },
        {
          displayName: "Rectangle",
          hexCode: "#E8F4FD",
          skuSuffix: "RCT",
          basePrice: 29900,
          mrp: 39900,
          isActive: true,
          displayOrder: 1,
          images: [
            { url: u("photo-1578915266302-4c44cd2a89ae"), isPrimary: true, displayOrder: 0 },
          ],
        },
        {
          displayName: "Heart",
          hexCode: "#FFF0F3",
          skuSuffix: "HRT",
          basePrice: 34900,
          mrp: 44900,
          isActive: true,
          displayOrder: 2,
          images: [
            { url: u("photo-1522312346375-d1e52e2b99b3"), isPrimary: true, displayOrder: 0 },
          ],
        },
      ],
      images: [
        u("photo-1590874103328-eac38a683ce7"),
        u("photo-1578915266302-4c44cd2a89ae"),
        u("photo-1522312346375-d1e52e2b99b3"),
        u("photo-1553062407-98eeb64c6a62"),
      ],
      tags: ["keychain", "acrylic", "photo", "personalized"],
    },
    {
      sku: "KEY-002",
      slug: "spotify-song-code-keychain",
      name: "Spotify Song Code Keychain",
      description: "<p>Turn your favorite song into a scannable Spotify code keychain — the most personal gift for music lovers.</p><ul><li>5mm UV-printed acrylic</li><li>Scan with Spotify app</li><li>Song name printed below</li><li>Perfect couples gift</li></ul>",
      pricePaise: 39900,
      compareAtPaise: 54900,
      stock: 200,
      featured: true,
      recipients: ["her", "him", "couples"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Song name + artist (we'll generate the Spotify code)",
      customizationTextPlaceholder: "e.g. Tum Hi Ho by Arijit Singh",
      customizationTextRequired: true,
      customizationImageRequired: false,
      images: [
        u("photo-1522312346375-d1e52e2b99b3"),
        u("photo-1590874103328-eac38a683ce7"),
        u("photo-1578915266302-4c44cd2a89ae"),
        u("photo-1553062407-98eeb64c6a62"),
      ],
      tags: ["spotify", "music", "keychain", "couple"],
    },
    {
      sku: "KEY-003",
      slug: "leather-name-tag-keychain",
      name: "Engraved Leather Name Keychain",
      description: "<p>Premium genuine leather keychain with your name laser-engraved. Minimal, classy, and built to last.</p><ul><li>Genuine leather (brown/black)</li><li>Precision laser engraving</li><li>Gold or silver ring hardware</li><li>Great corporate gift</li></ul>",
      pricePaise: 49900,
      compareAtPaise: 69900,
      stock: 150,
      featured: false,
      recipients: ["him", "corporate", "her"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Name or initials to engrave",
      customizationTextPlaceholder: "e.g. Arjun K.",
      customizationTextRequired: true,
      customizationImageRequired: false,
      colourVariants: [
        {
          displayName: "Tan Brown",
          hexCode: "#A0522D",
          skuSuffix: "TAN",
          basePrice: 49900,
          mrp: 69900,
          isActive: true,
          displayOrder: 0,
          images: [
            { url: u("photo-1553062407-98eeb64c6a62"), isPrimary: true, displayOrder: 0 },
          ],
        },
        {
          displayName: "Midnight Black",
          hexCode: "#1A1A1A",
          skuSuffix: "BLK",
          basePrice: 49900,
          mrp: 69900,
          isActive: true,
          displayOrder: 1,
          images: [
            { url: u("photo-1590874103328-eac38a683ce7"), isPrimary: true, displayOrder: 0 },
          ],
        },
      ],
      images: [
        u("photo-1553062407-98eeb64c6a62"),
        u("photo-1590874103328-eac38a683ce7"),
        u("photo-1578915266302-4c44cd2a89ae"),
        u("photo-1522312346375-d1e52e2b99b3"),
      ],
      tags: ["leather", "engraved", "corporate", "minimal"],
    },
  ],

  // ── Gift Sets & Hampers ───────────────────────────────────────────────────
  "gift-sets": [
    {
      sku: "GFT-001",
      slug: "birthday-gift-hamper",
      name: "Birthday Celebration Gift Hamper",
      description: "<p>A thoughtfully curated birthday hamper — a personalized mug, photo frame, and a heartfelt card, all beautifully wrapped.</p><ul><li>1 personalized photo mug</li><li>1 wooden photo frame</li><li>1 handwritten card</li><li>Premium satin ribbon wrapping</li></ul>",
      pricePaise: 199900,
      compareAtPaise: 259900,
      stock: 60,
      featured: true,
      recipients: ["her", "him", "couples", "kids"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Birthday message for the card",
      customizationTextPlaceholder: "e.g. Wishing you a year full of joy, laughter, and love!",
      customizationTextRequired: false,
      customizationImageRequired: true,
      images: [
        u("photo-1549465220-1a8b9238cd48"),
        u("photo-1607344645866-009c320b63e0"),
        u("photo-1513201097305-4fa07f0f1b58"),
        u("photo-1578662996442-48f60103fc96"),
        u("photo-1526170375885-4d8ecf77b99f"),
      ],
      tags: ["hamper", "birthday", "combo", "gift-set"],
    },
    {
      sku: "GFT-002",
      slug: "anniversary-love-combo",
      name: "Anniversary Love Combo",
      description: "<p>Mark your milestone in style — our anniversary combo includes a couple cushion, photo frame, and a personalized card in an elegant gift box.</p><ul><li>1 photo cushion (40×40)</li><li>1 couple photo frame</li><li>1 personalized anniversary card</li><li>Luxury gift box</li></ul>",
      pricePaise: 299900,
      compareAtPaise: 399900,
      stock: 40,
      featured: true,
      recipients: ["couples", "her"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Your love story in one line",
      customizationTextPlaceholder: "e.g. Together since June 2018 ♥",
      customizationTextRequired: false,
      customizationImageRequired: true,
      images: [
        u("photo-1526170375885-4d8ecf77b99f"),
        u("photo-1493863641943-9b68992a8d28"),
        u("photo-1584100936591-c65d4534f48a"),
        u("photo-1531346878377-a5be20888e57"),
      ],
      tags: ["anniversary", "couple", "combo", "luxury"],
    },
    {
      sku: "GFT-003",
      slug: "corporate-desk-gift-set",
      name: "Corporate Desk Gift Set",
      description: "<p>Elegant corporate gifts that leave an impression — an engraved pen, leather keychain, and branded mug in a premium black gift box.</p><ul><li>1 laser-engraved pen</li><li>1 leather name keychain</li><li>1 branded mug</li><li>Premium black gift box</li><li>Bulk pricing available</li></ul>",
      pricePaise: 249900,
      compareAtPaise: 299900,
      stock: 100,
      featured: false,
      recipients: ["corporate", "him"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Name or company to print",
      customizationTextPlaceholder: "e.g. Rahul Sharma | Acme Corp",
      customizationTextRequired: true,
      customizationImageRequired: false,
      images: [
        u("photo-1497366216548-37526070297c"),
        u("photo-1553062407-98eeb64c6a62"),
        u("photo-1514228742587-6b1558fcca3d"),
        u("photo-1524758631624-e2822e304c36"),
      ],
      tags: ["corporate", "office", "bulk", "branded"],
    },
    {
      sku: "GFT-004",
      slug: "new-baby-gift-hamper",
      name: "New Baby Gift Hamper",
      description: "<p>Welcome the little one with the sweetest personalized gift set — a baby name cushion, first photo frame, and a milestone card.</p><ul><li>1 baby name cushion</li><li>1 birth detail photo frame</li><li>1 milestone card</li><li>Pastel gift wrapping</li></ul>",
      pricePaise: 279900,
      compareAtPaise: 349900,
      stock: 30,
      featured: false,
      recipients: ["kids", "her"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Baby's name + birth date + weight",
      customizationTextPlaceholder: "e.g. Aryan | 12 Jan 2024 | 3.2 kg",
      customizationTextRequired: true,
      customizationImageRequired: false,
      images: [
        u("photo-1607344645866-009c320b63e0"),
        u("photo-1549465220-1a8b9238cd48"),
        u("photo-1584100936591-c65d4534f48a"),
        u("photo-1513201097305-4fa07f0f1b58"),
      ],
      tags: ["baby", "newborn", "hamper", "baby-gift"],
    },
  ],

  // ── Wall Art & Décor ─────────────────────────────────────────────────────
  "wall-art": [
    {
      sku: "WAL-001",
      slug: "acrylic-led-night-lamp-photo",
      name: "Acrylic LED Night Lamp with Photo",
      description: "<p>A glowing acrylic base lamp that illuminates your photo in a warm amber glow — a bedside memory that shines all night.</p><ul><li>Crystal-clear 5mm acrylic</li><li>USB-powered LED base</li><li>Colour-changing modes (7 colours)</li><li>Photo + name engraved</li></ul>",
      pricePaise: 129900,
      compareAtPaise: 169900,
      stock: 80,
      featured: true,
      recipients: ["her", "him", "couples", "kids"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Names or message to engrave",
      customizationTextPlaceholder: "e.g. Arjun & Priya | Forever",
      customizationTextRequired: false,
      customizationImageRequired: true,
      images: [
        u("photo-1567427017947-545c5f8d16ad"),
        u("photo-1517245386807-bb43f82c33c4"),
        u("photo-1497366858526-56e1c0c2b627"),
        u("photo-1558618666-fcd25c85cd64"),
      ],
      tags: ["lamp", "led", "acrylic", "night-light"],
    },
    {
      sku: "WAL-002",
      slug: "polaroid-collage-wall-set",
      name: "Polaroid-Style Photo Collage Set",
      description: "<p>A set of 15 mini polaroid-style prints in a kraft box — string lights sold separately, but your memories shine on their own.</p><ul><li>Set of 15 polaroid prints</li><li>4×4\" borderless prints</li><li>Hand-dated borders option</li><li>Kraft keepsake box</li></ul>",
      pricePaise: 79900,
      compareAtPaise: 99900,
      stock: 120,
      featured: false,
      recipients: ["her", "couples", "kids"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Caption for each print (comma-separated, up to 15)",
      customizationTextPlaceholder: "e.g. Goa 2023, Our First Date, Forever 💛",
      customizationTextRequired: false,
      customizationImageRequired: true,
      images: [
        u("photo-1526170375885-4d8ecf77b99f"),
        u("photo-1493863641943-9b68992a8d28"),
        u("photo-1516455207990-7a41ce80f7ee"),
        u("photo-1526506118085-60ce8714f8c5"),
      ],
      tags: ["polaroid", "collage", "print-set", "wall-decor"],
    },
    {
      sku: "WAL-003",
      slug: "personalized-family-name-sign",
      name: "Personalized Family Name Sign",
      description: "<p>A statement wooden sign that spells your family name in beautiful laser-cut lettering — a centrepiece for any home.</p><ul><li>Solid pine or MDF</li><li>Laser-cut 3D letters</li><li>Stained, painted, or natural finish</li><li>Multiple size options</li></ul>",
      pricePaise: 199900,
      compareAtPaise: 249900,
      stock: 40,
      featured: false,
      recipients: ["her", "him", "couples"],
      allowCustomerCustomization: true,
      customizationTextLabel: "Family surname + year established (optional)",
      customizationTextPlaceholder: "e.g. The Sharma Family | Est. 2018",
      customizationTextRequired: true,
      customizationImageRequired: false,
      images: [
        u("photo-1497366216548-37526070297c"),
        u("photo-1524758631624-e2822e304c36"),
        u("photo-1558618666-fcd25c85cd64"),
        u("photo-1531346878377-a5be20888e57"),
      ],
      tags: ["family", "sign", "wood", "laser-cut"],
    },
    {
      sku: "WAL-004",
      slug: "custom-map-art-city-print",
      name: "Custom City Map Art Print",
      description: "<p>A minimalist map of the city where your story began — printed on premium matte paper and ready to frame.</p><ul><li>300 GSM matte paper</li><li>Minimalist map design</li><li>Custom city + date + coordinates</li><li>A3 or A2 size</li></ul>",
      pricePaise: 99900,
      compareAtPaise: 129900,
      stock: 90,
      featured: false,
      recipients: ["couples", "him", "her"],
      allowCustomerCustomization: true,
      customizationTextLabel: "City name + significant date + custom text",
      customizationTextPlaceholder: "e.g. Mumbai | 14 Feb 2020 | Where We Began",
      customizationTextRequired: true,
      customizationImageRequired: false,
      images: [
        u("photo-1506905925346-21bda4d32df4"),
        u("photo-1516455207990-7a41ce80f7ee"),
        u("photo-1567427017947-545c5f8d16ad"),
        u("photo-1558618666-fcd25c85cd64"),
      ],
      tags: ["map", "city", "print", "minimal"],
    },
  ],
};

// ---------------------------------------------------------------------------
// Admin user seed
// ---------------------------------------------------------------------------
async function seedAdminUser(required: boolean) {
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
  const adminPass = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPass) {
    if (required) {
      console.error("Admin-only mode: set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local");
      process.exit(1);
    }
    console.log("Skip admin seed (set SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD in .env.local)");
    return;
  }
  const hash = await bcrypt.hash(adminPass, 12);
  await User.findOneAndUpdate(
    { email: adminEmail.toLowerCase() },
    { $set: { email: adminEmail.toLowerCase(), passwordHash: hash, name: "Prisbo Admin", role: "admin" } },
    { upsert: true },
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  await mongoose.connect(uri!);

  if (isAdminOnlySeed()) {
    console.log("Connected. Admin-only: upserting user (catalog unchanged)…");
    await seedAdminUser(true);
    console.log("Done.");
    await mongoose.disconnect();
    return;
  }

  console.log("Connected. Clearing catalog…");
  await Product.deleteMany({});
  await SchemaField.deleteMany({});
  await Subcategory.deleteMany({});
  await Category.deleteMany({});

  const catMap = new Map<string, mongoose.Types.ObjectId>();
  for (const c of categories) {
    const doc = await Category.create(c);
    catMap.set(c.slug, doc._id);
    console.log(`  Category: ${c.name}`);
  }

  let totalProducts = 0;
  for (const [catSlug, prods] of Object.entries(products)) {
    const cid = catMap.get(catSlug);
    if (!cid) {
      console.warn(`  WARNING: no category for slug "${catSlug}"`);
      continue;
    }

    for (const p of prods) {
      await Product.create({
        categoryId: cid,
        name: p.name,
        slug: p.slug,
        description: p.description,
        pricePaise: p.pricePaise,
        compareAtPaise: p.compareAtPaise,
        sku: p.sku,
        stock: p.stock,
        images: p.images,
        tags: p.tags,
        featured: p.featured ?? false,
        isActive: true,
        status: "PUBLISHED",
        publishedAt: new Date(),
        currency: "INR",
        recipients: p.recipients ?? [],
        allowCustomerCustomization: p.allowCustomerCustomization ?? false,
        customizationTextLabel: p.customizationTextLabel ?? "Notes / text to print",
        customizationTextPlaceholder: p.customizationTextPlaceholder ?? "",
        customizationTextRequired: p.customizationTextRequired ?? false,
        customizationImageRequired: p.customizationImageRequired ?? false,
        colourVariants: p.colourVariants ?? [],
        weightKg: p.weightKg ?? 0.4,
        hasColourVariants: (p.colourVariants?.length ?? 0) > 0,
      });
      console.log(`    Product: ${p.name}`);
      totalProducts++;
    }
  }

  await seedAdminUser(false);

  console.log(`\nSeed complete: ${categories.length} categories, ${totalProducts} products.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
