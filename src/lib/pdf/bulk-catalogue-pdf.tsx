import { Document, Image, Page, Text, View, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";
import { formatInrFromPaise } from "@/lib/format";
import type { CataloguePdfItem } from "@/lib/bulk/catalogue-images";
import {
  COURIER_LEAD,
  PROOF_LEAD,
  bandCaption,
  deliveryTable,
  packagingRows,
  personalisationRows,
  tierHeading,
} from "@/lib/bulk/offer";
import { BULK_ENQUIRY_MIN, BULK_PRICE_MOQ } from "@/lib/bulk/pricing";

Font.registerHyphenationCallback((word) => [word]);

const INK = "#1c1612";
const MUTED = "#5c534c";
const AMBER = "#8a4d12";
const CREAM = "#f9f8f4";
const LINE = "#e4d9cc";

const styles = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 36, fontSize: 10, fontFamily: "Helvetica", color: INK },
  cover: { padding: 48, fontFamily: "Helvetica", backgroundColor: "#0f0804", color: "#f9f8f4" },
  kicker: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: "#e0b07a", marginBottom: 16 },
  coverTitle: { fontSize: 32, marginBottom: 12 },
  coverBody: { fontSize: 12, lineHeight: 1.5, color: "#f3eadf", maxWidth: 420 },
  h2: { fontSize: 14, marginBottom: 6, marginTop: 14 },
  p: { fontSize: 10, lineHeight: 1.45, color: MUTED, marginBottom: 6 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 6 },
  offerTitle: { width: "32%", fontSize: 10 },
  offerDetail: { width: "46%", fontSize: 9, color: MUTED },
  offerPrice: { width: "22%", fontSize: 9, textAlign: "right" },
  product: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 8 },
  photo: { width: 72, height: 72, marginRight: 10, backgroundColor: CREAM },
  photoFallback: {
    width: 72,
    height: 72,
    marginRight: 10,
    backgroundColor: CREAM,
    alignItems: "center",
    justifyContent: "center",
  },
  productBody: { flex: 1 },
  productName: { fontSize: 11, marginBottom: 2 },
  meta: { fontSize: 8, color: MUTED, marginBottom: 4 },
  prices: { flexDirection: "row", marginTop: 2 },
  priceCell: { width: "20%" },
  priceLabel: { fontSize: 7, color: MUTED },
  priceValue: { fontSize: 9 },
  category: { fontSize: 12, marginTop: 12, marginBottom: 2, color: AMBER },
  foot: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: MUTED,
  },
});

function pdfText(value: string): string {
  return value
    .replace(/₹\s?/g, "Rs ")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"');
}

function money(paise: number): string {
  return pdfText(formatInrFromPaise(paise));
}

function Footer() {
  return (
    <Text
      style={styles.foot}
      fixed
      render={({ pageNumber, totalPages }) =>
        `Prisbo Creations  ·  Bulk catalogue  ·  ${pageNumber} / ${totalPages}`
      }
    />
  );
}

function Cover({ issued }: { issued: string }) {
  return (
    <Page size="A4" style={styles.cover}>
      <Text style={styles.kicker}>Prisbo Creations</Text>
      <Text style={styles.coverTitle}>Bulk catalogue</Text>
      <Text style={styles.coverBody}>
        {pdfText(
          `Personalised pieces for teams, churches, schools, and events. Unit prices at 50, 100, 250, and 500 pieces, with photographs of the pieces currently on the shop. ${issued}.`,
        )}
      </Text>
      <Text style={[styles.coverBody, { marginTop: 18 }]}>
        {pdfText(
          "Listed prices are per piece, for the same artwork on every unit. Delivery is extra. A quote confirms the run.",
        )}
      </Text>
    </Page>
  );
}

function Guide() {
  const personalisation = personalisationRows();
  const packaging = packagingRows();
  const delivery = deliveryTable();
  return (
    <Page size="A4" style={styles.page} wrap>
      <Text style={styles.h2}>How the prices work</Text>
      <Text style={styles.p}>
        {pdfText(
          `Shop price is what one piece costs on the website. Volume prices start at ${BULK_PRICE_MOQ} pieces. Printed pieces such as pens, cards, and stickers step down further than frames, lamps, and hampers, where the materials take most of the price. A cell that says Quote is one we price for that run. Enquiries start at ${BULK_ENQUIRY_MIN} pieces.`,
        )}
      </Text>

      <Text style={styles.h2}>Personalisation and logo printing</Text>
      {personalisation.map((row) => (
        <View key={row.title} style={styles.row} wrap={false}>
          <Text style={styles.offerTitle}>{pdfText(row.title)}</Text>
          <Text style={styles.offerDetail}>{pdfText(row.detail)}</Text>
          <Text style={styles.offerPrice}>{pdfText(row.price)}</Text>
        </View>
      ))}

      <Text style={styles.h2}>Packaging</Text>
      {packaging.map((row) => (
        <View key={row.title} style={styles.row} wrap={false}>
          <Text style={styles.offerTitle}>{pdfText(row.title)}</Text>
          <Text style={styles.offerDetail}>{pdfText(row.detail)}</Text>
          <Text style={styles.offerPrice}>{pdfText(row.price)}</Text>
        </View>
      ))}

      <Text style={styles.h2}>Minimums and delivery</Text>
      <Text style={styles.p}>
        {pdfText(
          `We send a proof within ${PROOF_LEAD}. The studio times below start after you approve it. Courier across India is then ${COURIER_LEAD}.`,
        )}
      </Text>
      <View style={styles.row}>
        <Text style={[styles.offerTitle, { width: "18%" }]}>Quantity</Text>
        <Text style={[styles.offerDetail, { width: "32%" }]}>Print and everyday</Text>
        <Text style={[styles.offerDetail, { width: "28%" }]}>Made pieces</Text>
        <Text style={[styles.offerPrice, { width: "22%" }]}>Courier</Text>
      </View>
      {delivery.map((row) => (
        <View key={row.quantity} style={styles.row} wrap={false}>
          <Text style={[styles.offerTitle, { width: "18%" }]}>{row.quantity}</Text>
          <Text style={[styles.offerDetail, { width: "32%" }]}>{pdfText(row.everyday)}</Text>
          <Text style={[styles.offerDetail, { width: "28%" }]}>{pdfText(row.made)}</Text>
          <Text style={[styles.offerPrice, { width: "22%" }]}>{pdfText(row.courier)}</Text>
        </View>
      ))}
      <Footer />
    </Page>
  );
}

function ProductRow({ item }: { item: CataloguePdfItem }) {
  return (
    <View style={styles.product} wrap={false}>
      {item.imageDataUri ? (
        <Image src={item.imageDataUri} style={styles.photo} />
      ) : (
        <View style={styles.photoFallback}>
          <Text style={{ fontSize: 16, color: AMBER }}>{pdfText(item.name.slice(0, 1))}</Text>
        </View>
      )}
      <View style={styles.productBody}>
        <Text style={styles.productName}>{pdfText(item.name)}</Text>
        <Text style={styles.meta}>
          {pdfText(
            [
              item.band ? bandCaption(item.band) : "Quoted per run",
              item.moq ? `Minimum ${item.moq}` : `Enquire from ${BULK_ENQUIRY_MIN}`,
              item.leadTime ? `${item.leadTime} in the studio` : "Studio time on request",
            ].join("  ·  "),
          )}
        </Text>
        {item.summary ? <Text style={styles.meta}>{pdfText(item.summary)}</Text> : null}
        <View style={styles.prices}>
          <View style={styles.priceCell}>
            <Text style={styles.priceLabel}>Shop</Text>
            <Text style={styles.priceValue}>{money(item.retailPaise)}</Text>
          </View>
          {item.tiers.map((tier) => (
            <View key={tier.qty} style={styles.priceCell}>
              <Text style={styles.priceLabel}>{tierHeading(tier.qty)}</Text>
              <Text style={styles.priceValue}>{tier.unitPaise == null ? "Quote" : money(tier.unitPaise)}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function Products({ items }: { items: CataloguePdfItem[] }) {
  const groups = new Map<string, CataloguePdfItem[]>();
  for (const item of items) {
    const list = groups.get(item.category) ?? [];
    list.push(item);
    groups.set(item.category, list);
  }
  const photos = items.filter((item) => item.imageDataUri).length;
  return (
    <Page size="A4" style={styles.page} wrap>
      <Text style={styles.h2}>Pieces</Text>
      <Text style={styles.p}>
        {photos > 0
          ? pdfText(`${photos} of ${items.length} pieces include a photograph from the shop.`)
          : "Photographs were not available for this download. Names and prices are current."}
      </Text>
      {[...groups.entries()].map(([category, rows]) => (
        <View key={category}>
          <Text style={styles.category}>{pdfText(category)}</Text>
          {rows.map((item) => (
            <ProductRow key={item.id} item={item} />
          ))}
        </View>
      ))}
      <Footer />
    </Page>
  );
}

function BulkCatalogueDocument({ items, issued }: { items: CataloguePdfItem[]; issued: string }) {
  return (
    <Document title="Prisbo Creations bulk catalogue" author="Prisbo Creations">
      <Cover issued={issued} />
      <Guide />
      <Products items={items} />
    </Document>
  );
}

export async function renderBulkCataloguePdf(items: CataloguePdfItem[]): Promise<Buffer> {
  const issued = new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const buf = await renderToBuffer(<BulkCatalogueDocument items={items} issued={issued} />);
  return buf;
}
