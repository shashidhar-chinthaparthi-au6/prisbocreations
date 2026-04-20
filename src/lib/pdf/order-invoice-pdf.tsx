import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatInrFromPaise } from "@/lib/format";
import { orderLineTotalPaise } from "@/lib/order-line-total";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 9, color: "#444", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  h2: { fontSize: 10, fontWeight: "bold", marginBottom: 6, textTransform: "uppercase", color: "#555" },
  muted: { color: "#666" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 4,
    marginTop: 12,
    fontWeight: "bold",
  },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#eee", paddingVertical: 6 },
  colItem: { width: "52%" },
  colQty: { width: "12%", textAlign: "right" as const },
  colAmt: { width: "36%", textAlign: "right" as const },
  totals: { marginTop: 16, marginLeft: "auto", width: "45%" },
  totalLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  grand: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#333", fontSize: 12, fontWeight: "bold" },
  foot: { marginTop: 32, fontSize: 8, color: "#666", textAlign: "center" as const },
});

export type OrderInvoicePdfInput = {
  invoiceNumber: string;
  orderId: string;
  createdLabel: string;
  seller: {
    legalName: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  gstin?: string;
  billTo: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  paymentLabel: string;
  status: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPricePaise: number;
    giftWrapPaise?: number;
    giftMessage?: string;
  }>;
  subtotalPaise: number;
  shippingPaise: number;
  discountPaise: number;
  totalPaise: number;
};

function OrderInvoicePdfDocument(props: OrderInvoicePdfInput) {
  const {
    invoiceNumber,
    orderId,
    createdLabel,
    seller,
    gstin,
    billTo,
    paymentLabel,
    status,
    items,
    subtotalPaise,
    shippingPaise,
    discountPaise,
    totalPaise,
  } = props;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Prisbo Creations</Text>
        <Text style={styles.subtitle}>Tax invoice / Bill of supply</Text>

        <View style={styles.row}>
          <View>
            <Text style={styles.h2}>Sold by</Text>
            <Text>{seller.legalName}</Text>
            <Text style={styles.muted}>{seller.line1}</Text>
            <Text style={styles.muted}>{seller.line2}</Text>
            <Text style={styles.muted}>
              {seller.city}, {seller.state} {seller.postalCode}, {seller.country}
            </Text>
            <Text style={styles.muted}>Phone: {seller.phone}</Text>
            {gstin ? <Text style={styles.muted}>GSTIN: {gstin}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontFamily: "Courier", fontSize: 11 }}>{invoiceNumber}</Text>
            <Text style={styles.muted}>Order ref</Text>
            <Text style={{ fontFamily: "Courier", fontSize: 8, color: "#666" }}>{orderId}</Text>
            <Text style={{ ...styles.muted, marginTop: 6 }}>Date</Text>
            <Text>{createdLabel}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ width: "48%" }}>
            <Text style={styles.h2}>Bill to</Text>
            <Text>{billTo.fullName}</Text>
            <Text style={styles.muted}>{billTo.line1}</Text>
            {billTo.line2 ? <Text style={styles.muted}>{billTo.line2}</Text> : null}
            <Text style={styles.muted}>
              {billTo.city}, {billTo.state} {billTo.postalCode}
            </Text>
            <Text style={styles.muted}>{billTo.country}</Text>
            <Text style={styles.muted}>Phone: {billTo.phone}</Text>
          </View>
          <View style={{ width: "48%" }}>
            <Text style={styles.h2}>Payment</Text>
            <Text>{paymentLabel}</Text>
            <Text style={styles.muted}>
              Status: <Text style={{ textTransform: "capitalize" }}>{status}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colItem}>Item</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colAmt}>Amount</Text>
        </View>
        {items.map((line, i) => (
          <View key={i} style={styles.tableRow} wrap={false}>
            <View style={styles.colItem}>
              <Text>{line.name}</Text>
              {line.giftMessage?.trim() ? (
                <Text style={{ fontSize: 8, color: "#666" }}>Gift: {line.giftMessage}</Text>
              ) : null}
            </View>
            <Text style={styles.colQty}>{line.quantity}</Text>
            <Text style={styles.colAmt}>{formatInrFromPaise(orderLineTotalPaise(line))}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalLine}>
            <Text style={styles.muted}>Subtotal</Text>
            <Text>{formatInrFromPaise(subtotalPaise)}</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.muted}>Delivery</Text>
            <Text>{formatInrFromPaise(shippingPaise)}</Text>
          </View>
          {discountPaise > 0 ? (
            <View style={styles.totalLine}>
              <Text style={styles.muted}>Discount</Text>
              <Text>-{formatInrFromPaise(discountPaise)}</Text>
            </View>
          ) : null}
          <View style={styles.grand}>
            <Text>Total</Text>
            <Text>{formatInrFromPaise(totalPaise)}</Text>
          </View>
        </View>

        <Text style={styles.foot}>
          Prices in INR. This is a computer-generated invoice. For GST or tax questions, retain this document with
          your payment proof.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderOrderInvoicePdf(input: OrderInvoicePdfInput): Promise<Buffer> {
  const buf = await renderToBuffer(<OrderInvoicePdfDocument {...input} />);
  return buf;
}
