export type ExpenseItem = {
  id: string;
  description: string;
  amountCents: number;
  mode?: "flat" | "per_day";
  rateCentsPerDay?: number;
  days?: number;
  propertyId?: string;
  day?: number;
  createdAt: string;
  updatedAt: string;
};

export type Region = "india" | "us" | "europe" | "uk";

export type ListingProvider = "airbnb" | "booking" | "other";

export type ListingLink = {
  url: string;
  active: boolean;
};

export type Property = {
  id: string;
  name: string;
  tenure?: "owned" | "rented";
  listings?: Partial<Record<ListingProvider, ListingLink>>;
  rentDueDay?: number; // 1-31
  agreementValidUntil?: string; // YYYY-MM-DD (local date)
};

export type MonthProperty = {
  propertyId: string;
  rentCents: number; // monthly base rent cost (minor units); used when tenure === "rented"
};

export type BookingItem = {
  id: string;
  propertyId: string;
  day?: number;
  nights: number;
  pricePerNightCents: number; // minor units
  createdAt: string;
  updatedAt: string;
};

export type MonthEntry = {
  id: string;
  month: string; // YYYY-MM
  incomeCents: number;
  properties?: MonthProperty[];
  expenses: ExpenseItem[];
  bookings?: BookingItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type AppSettings = {
  region?: Region;
  currency: string; // ISO 4217, e.g. "INR"
  locale: string; // BCP-47, e.g. "en-IN"
};

export type BnbDataV1 = {
  version: 1;
  months: MonthEntry[];
};

export type BnbDataV2 = {
  version: 2;
  settings: AppSettings;
  months: MonthEntry[];
};

export type BnbDataV3 = {
  version: 3;
  settings: AppSettings & { properties: Property[] };
  months: MonthEntry[];
};

export type BnbDataV4 = {
  version: 4;
  settings: AppSettings & { properties: Property[] };
  months: MonthEntry[];
};

export type BnbDataV5 = {
  version: 5;
  settings: AppSettings & { properties: Property[] };
  months: MonthEntry[];
};

export type BnbDataV6 = {
  version: 6;
  settings: AppSettings & { properties: Property[] };
  months: MonthEntry[];
};

export type BnbDataV7 = {
  version: 7;
  settings: AppSettings & { properties: Property[] };
  months: MonthEntry[];
};

export type BnbData =
  | BnbDataV1
  | BnbDataV2
  | BnbDataV3
  | BnbDataV4
  | BnbDataV5
  | BnbDataV6
  | BnbDataV7;

