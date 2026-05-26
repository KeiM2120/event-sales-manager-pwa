export type Series =
  | "comic-market"
  | "doujin-original"
  | "doujin-secondary-only"
  | "other";

export type ProductGenre =
  | "doujinshi-illustration"
  | "doujinshi-manga"
  | "doujinshi-anthology"
  | "doujinshi-other"
  | "goods-acrylic"
  | "goods-paper"
  | "goods-sticker"
  | "goods-fabric"
  | "goods-other"
  | "digital"
  | "other"
  | "book"
  | "goods"
  | "music"
  | "software";

export type ExpenseCategory =
  | "goods-production"
  | "event-participation"
  | "lodging"
  | "shipping"
  | "booth-supply"
  | "food"
  | "promotion"
  | "outsourcing"
  | "printing"
  | "transport"
  | "space"
  | "supply"
  | "other";

export interface Event {
  id: string;
  name: string;
  eventDate: string;
  series: Series;
  circleSpace?: string;
  isClosed?: boolean;
  isHidden?: boolean;
  memo?: string;
}

export interface Product {
  id: string;
  name: string;
  productGenre: ProductGenre;
  defaultPrice: number;
  isActive: boolean;
}

export interface Bundle {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

export interface BundleItem {
  bundleId: string;
  productId: string;
  quantity: number;
}

export interface EventInventory {
  eventId: string;
  productId: string;
  initialStock: number;
  reservedStock: number;
  reservationMemo?: string;
}

export type SaleLineKind = "product" | "bundle" | "reservation";

export interface SaleLineComponent {
  productId: string;
  productName: string;
  productGenre: ProductGenre;
  quantity: number;
}

export interface SaleLine {
  lineId: string;
  kind: SaleLineKind;
  refId: string;
  displayName: string;
  productGenre: ProductGenre;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  components?: SaleLineComponent[];
}

export interface Sale {
  id: string;
  eventId: string;
  datetime: string;
  totalAmount: number;
  canceled: boolean;
  lines: SaleLine[];
}

export type CheckoutLineComponent = SaleLineComponent;

export interface CheckoutLine {
  lineId: string;
  kind: SaleLineKind;
  refId: string;
  displayName: string;
  productGenre: ProductGenre;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  components?: CheckoutLineComponent[];
}

export interface CheckoutState {
  eventId: string;
  lines: CheckoutLine[];
  totalQuantity: number;
  totalAmount: number;
}

export interface Expense {
  id: string;
  eventId: string;
  category: ExpenseCategory;
  payee: string;
  amount: number;
  memo?: string;
}
