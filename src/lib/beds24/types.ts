/**
 * Beds24 API v2 shapes used by this site. Field names follow the official
 * OpenAPI definition (apiV2.yaml, "API V2" 3.0.0). Only the fields we read are
 * declared; everything else is passed through as `unknown`.
 */

export interface Beds24Envelope<T> {
  success?: boolean;
  type?: string;
  count?: number;
  pages?: { nextPageExists?: boolean; nextPageLink?: string };
  data?: T;
  /** Present on UnsuccessfulApiResponse. */
  code?: number;
  error?: string;
}

export interface Beds24Text {
  language?: string;
  headline?: string;
  propertyDescription?: string;
  propertyDescription1?: string;
  propertyDescription2?: string;
  houseRules?: string;
  directions?: string;
  /** Room texts use other keys (displayName, roomDescription, ...). */
  [key: string]: unknown;
}

/** Pictures are not described by the public spec; we read common shapes. */
export interface Beds24Picture {
  url?: string;
  src?: string;
  large?: string;
  original?: string;
  caption?: string;
  description?: string;
  text?: string;
  alt?: string;
  [key: string]: unknown;
}

export interface Beds24UpsellItem {
  index?: number;
  enable?: boolean;
  type?: string;
  amount?: number;
  per?: string;
  period?: string;
}

export interface Beds24Room {
  id: number;
  propertyId?: number;
  name?: string;
  roomType?: string;
  qty?: number;
  minPrice?: number;
  maxPeople?: number;
  maxAdult?: number;
  minStay?: number;
  maxStay?: number;
  rackRate?: number;
  cleaningFee?: number;
  sellPriority?: number | null;
  roomSize?: number;
  featureCodes?: string[][];
  texts?: Beds24Text[];
  pictures?: Beds24Picture[];
  images?: Beds24Picture[];
}

export interface Beds24Property {
  id: number;
  name?: string;
  propertyType?: string;
  currency?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  latitude?: number;
  longitude?: number;
  checkInStart?: string;
  checkOutEnd?: string;
  featureCodes?: string[][];
  texts?: Beds24Text[];
  upsellItems?: Beds24UpsellItem[];
  roomTypes?: Beds24Room[];
  pictures?: Beds24Picture[];
  images?: Beds24Picture[];
}

export interface Beds24CalendarRange {
  from: string;
  to: string;
  numAvail?: number;
  minStay?: number;
  maxStay?: number;
  override?: "none" | "blackout" | "exception" | "noCheckIn" | "noCheckOut" | "noCheckInOrCheckOut" | string;
  price1?: number;
  [key: string]: unknown;
}

export interface Beds24RoomCalendar {
  roomId: number;
  propertyId?: number;
  calendar?: Beds24CalendarRange[];
}

export interface Beds24Booking {
  id: number;
  propertyId?: number;
  roomId?: number;
  status?: string;
  arrival?: string;
  departure?: string;
  apiReference?: string;
  referer?: string;
  channel?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  price?: number;
  bookingTime?: string;
  modifiedTime?: string;
}

export interface Beds24PostResult {
  success?: boolean;
  new?: { id?: number; [key: string]: unknown } | number[] | number;
  modified?: { id?: number; [key: string]: unknown } | number[] | number;
  errors?: Array<{ action?: string; field?: string; message?: string }>;
  warnings?: Array<{ action?: string; field?: string; message?: string }>;
  info?: Array<{ action?: string; field?: string; message?: string }>;
}

export interface Beds24TokenResponse {
  token?: string;
  expiresIn?: number;
  refreshToken?: string;
}
