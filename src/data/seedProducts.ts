import type {
  ProductDetail,
  ProductFaq,
  ProductReview,
} from "../models/Product";

export type SeedProduct = {
  id: string;
  title: string;
  slug: string;
  images: string[];
  price: number;
  quantity: number;
  description: string;
  shortDescription: string;
  details: ProductDetail[];
  faqs: ProductFaq[];
  reviews: ProductReview[];
};

/**
 * Google Drive file IDs converted to direct view URLs.
 * Source shares:
 * https://drive.google.com/file/d/1eYktV6d6JlAlfLdagFPeCBm_XhnFum1K/view
 * https://drive.google.com/file/d/1LhSLHKeYq6pKGp_3bszcL5do7CGnBGAb/view
 */
const CREWNECK_IMAGES = [
  "https://lh3.googleusercontent.com/d/1eYktV6d6JlAlfLdagFPeCBm_XhnFum1K",
  "https://lh3.googleusercontent.com/d/1LhSLHKeYq6pKGp_3bszcL5do7CGnBGAb",
];

export const seedProducts: SeedProduct[] = [
  {
    id: "1",
    title: "Acid Wash Overflow Crewneck",
    slug: "acid-wash-overflow-crewneck",
    images: CREWNECK_IMAGES,
    price: 39.99,
    quantity: 24,
    shortDescription:
      "Wear your faith. Live with purpose. Premium acid-wash crewneck with the House of Overflow emblem.",
    description:
      "Wear your faith. Live with purpose. Overflow everywhere. This premium acid-wash crewneck features The House of Overflow signature emblem on the left chest — a bold reminder of who you are and whose you are. Soft, structured, and made for everyday wear, it pairs comfort with conviction whether you are headed to Sunday service, midweek gathering, or simply living out your calling through the week.\n\nEach piece is finished with a unique acid/mineral wash, so no two sweatshirts look exactly the same. Ribbed cuffs and hem keep the classic silhouette clean, while the midweight fabric holds its shape wash after wash.",
    details: [
      { label: "Category", value: "Apparel" },
      { label: "Style", value: "Crewneck Sweatshirt" },
      { label: "Finish", value: "Acid / Mineral Wash" },
      { label: "Fit", value: "Comfort Fit" },
      { label: "Care", value: "Machine wash cold, tumble dry low" },
    ],
    faqs: [
      {
        question: "What sizes are available?",
        answer:
          "This crewneck is currently offered in a comfort fit. Check the product information section for fit details, and reach out to us if you need help choosing the right size.",
      },
      {
        question: "How should I care for the acid-wash finish?",
        answer:
          "Machine wash cold and tumble dry low. Wash inside out to help preserve the emblem print and the unique mineral-wash texture.",
      },
      {
        question: "Will every sweatshirt look exactly the same?",
        answer:
          "No. The acid/mineral wash creates natural variation, so each piece has its own character while keeping the same House of Overflow emblem and overall look.",
      },
      {
        question: "How long does shipping take?",
        answer:
          "Orders are typically processed within a few business days. Shipping times vary by location. You will receive a confirmation once your order is placed.",
      },
    ],
    reviews: [
      {
        id: "r1",
        name: "Jordan M.",
        rating: 5,
        date: "June 12, 2026",
        comment:
          "Soft, well-made, and the emblem looks sharp. I wear it to service and throughout the week. Already thinking about ordering another.",
      },
      {
        id: "r2",
        name: "Alicia R.",
        rating: 5,
        date: "May 28, 2026",
        comment:
          "The wash is beautiful and the fit is comfortable without feeling bulky. Great quality for the price.",
      },
      {
        id: "r3",
        name: "Chris T.",
        rating: 4,
        date: "May 3, 2026",
        comment:
          "Really solid crewneck. Runs true to size for me. Love representing The House Of Overflow.",
      },
    ],
  },
];
