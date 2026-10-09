import type { Captured } from "./fake-browser.js";

export const captured: Captured = {
  "query": "banane",
  "productUrl": "https://www.piccantino.fr/holle/compote-koala-poire-banane-kiwi?sai=17876",
  "expected": {
    "productId": "17876",
    "name": "Compote \"Koala\" - Poire, Banane & Kiwi, 100 g",
    "price": 0.99
  },
  "searchRaw": [
    {
      "sai": "17876",
      "url": "https://www.piccantino.fr/holle/compote-koala-poire-banane-kiwi?sai=17876",
      "name": "Compote \"Koala\" - Poire, Banane & Kiwi, 100 g",
      "brand": "Holle",
      "price": "0,99 € (9,90 € / kg)",
      "unit_price": null,
      "limit": 999
    },
    {
      "sai": "17879",
      "url": "https://www.piccantino.fr/holle/compote-lama-banane-pomme-mangue-abricot?sai=17879",
      "name": "Compote \"Lama\" - Banane, Pomme, Mangue & Abricot, 100 g",
      "brand": "Holle",
      "price": "0,99 € (9,90 € / kg)",
      "unit_price": null,
      "limit": 999
    },
    {
      "sai": "8582",
      "url": "https://www.piccantino.fr/casali/choco-bananes-originales?sai=8582",
      "name": "Choco-Bananes Originales, 48 pièces (600 g)",
      "brand": "Casali",
      "price": "16,39 € (27,32 € / kg)",
      "unit_price": null,
      "limit": 999
    }
  ],
  "productRaw": {
    "sai": "17876",
    "name": "Holle Compote \"Koala\" - Poire, Banane & Kiwi, 100 g",
    "brand": "Holle",
    "description": "Qualité Demeter",
    "gtin": "7640161877276",
    "price": "0.99",
    "availability": "https://schema.org/InStock",
    "limit": 999,
    "ingredients": null
  },
  "cartEmpty": {
    "total": "0,00&nbsp;€",
    "items": []
  },
  "cartFilled": {
    "quantity": 2,
    "raw": {
      "total": "1,98&nbsp;€",
      "items": [
        {
          "article_id": 17876,
          "name": "Holle Compote \"Koala\" - Poire, Banane & Kiwi, 100 g",
          "quantity": 2,
          "price": "<strong>0,99&nbsp;€</strong>"
        }
      ]
    }
  }
};
