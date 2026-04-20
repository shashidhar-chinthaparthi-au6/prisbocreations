export const SMS_TEMPLATES = {
  ORDER_PLACED: {
    id: process.env.MSG91_TEMPLATE_ORDER_PLACED ?? "",
    vars: {
      VAR1: "order_number",
      VAR2: "first_name",
      VAR3: "total",
      VAR4: "track_url",
    },
  },
  ORDER_PAID: {
    id: process.env.MSG91_TEMPLATE_ORDER_PAID ?? "",
    vars: {
      VAR1: "order_number",
      VAR2: "first_name",
      VAR3: "total",
    },
  },
  ORDER_SHIPPED: {
    id: process.env.MSG91_TEMPLATE_ORDER_SHIPPED ?? "",
    vars: {
      VAR1: "order_number",
      VAR2: "awb_code",
      VAR3: "estimated_delivery",
      VAR4: "track_url",
    },
  },
  ORDER_CANCELLED: {
    id: process.env.MSG91_TEMPLATE_ORDER_CANCELLED ?? "",
    vars: {
      VAR1: "order_number",
      VAR2: "first_name",
    },
  },
};
