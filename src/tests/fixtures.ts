import { buildShop } from "./fake-browser.js";
import { captured } from "./data.js";

export const productUrl = captured.productUrl;
export const expected = { query: captured.query, ...captured.expected };
export const robotSnapshot = 'heading "Vérification de sécurité"\nlink "Mon compte"';

type RawCart = { total: string; items: Array<Record<string, unknown>> };

export function createShop() {
  const filled = captured.cartFilled.raw as RawCart;
  const line = filled.items[0];
  const unit = Number(String(line.price).replace(/<[^>]+>/g, "").replace(/[^0-9,.]/g, "").replace(",", "."));
  return buildShop(captured, {}, (count) => {
    if (count === 0) return captured.cartEmpty;
    return { total: `${(unit * count).toFixed(2).replace(".", ",")} €`, items: [{ ...line, quantity: count }] };
  });
}
