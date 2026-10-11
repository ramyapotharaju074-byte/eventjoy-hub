export const DEFAULT_PRICE = 49;
export const DEFAULT_CAPACITY = 200;
export const MAX_TICKETS_PER_ORDER = 10;

export function orderTotal(price: number, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_TICKETS_PER_ORDER) {
    throw new Error(`You can buy between 1 and ${MAX_TICKETS_PER_ORDER} tickets`);
  }
  return Math.round(price * quantity * 100) / 100;
}

export function seatsLeft(capacity: number, sold: number) {
  return Math.max(0, capacity - sold);
}

export const CATEGORIES = ["Conference", "Concert", "Workshop", "Festival", "Meetup", "Sports"] as const;
