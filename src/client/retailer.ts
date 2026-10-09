// Fichier généré par generate.mjs à partir de retailers/piccantino/spec.json. Ne pas modifier ici.
export interface ScopeField { key: string; env: string; description: string; example: string; pattern?: string }
export const RETAILER: {
  id: string; slug: string; version: string; label: string; origin: string; entryUrl: string; loginUrl: string; signupUrl: string;
  platform: string; fulfillment: ReadonlyArray<"delivery" | "click_and_collect">; accountRequired: boolean;
  scopeFields: ReadonlyArray<ScopeField>;
} = {
  "id": "piccantino",
  "slug": "piccantino",
  "version": "0.1.0",
  "label": "Piccantino",
  "origin": "https://www.piccantino.fr",
  "entryUrl": "https://www.piccantino.fr/",
  "loginUrl": "https://www.piccantino.fr/kunden/se-connecter",
  "signupUrl": "https://www.piccantino.fr/kunden/se-connecter",
  "platform": "nice-shop",
  "fulfillment": [
    "delivery"
  ],
  "accountRequired": false,
  "scopeFields": []
};
