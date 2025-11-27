// Local minimal Stripe types used while the real 'stripe' package is removed.
// When re‑enabling Stripe, delete this file and install the official package.
export interface CheckoutSessionCreateParamsLocal {
  mode: "payment";
  payment_method_types: string[];
  line_items: Array<{
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; description: string };
    };
    quantity: number;
    tax_rates?: string[];
  }>;
  success_url: string;
  cancel_url: string;
  metadata: Record<string, string>;
  automatic_tax?: { enabled: boolean };
}
