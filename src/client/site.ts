import {
  ROBOT_PATTERN, decodeHtml, formatEuro, hasVeganClaim, isObject, isOrganic, parsePrice, str, stripTags,
  type Adapter, type MutationInput, type SessionSignals,
} from "./adapter.js";
import { ContractChangedError } from "./errors.js";
import type { CartInput, ProductInput, SummaryInput } from "./types.js";

const HOSTS = new Set(["www.piccantino.fr", "piccantino.fr"]);

const PRELUDE = String.raw`
const clean = (value) => String(value == null ? "" : value).replace(/\s+/g, " ").trim();
const saiOf = (href) => { try { return new URL(href, location.origin).searchParams.get("sai"); } catch (error) { return null; } };
const stockOf = async (id) => {
  const response = await fetch("/ajax/product-cart-action?articleItemId=" + encodeURIComponent(id), { credentials: "include" });
  if (!response.ok) throw new Error("Stock HTTP " + response.status);
  const json = await response.json();
  return { count: json.count, limit: json.limit };
};
const readCart = async () => {
  const response = await fetch("/ajax/panier", { credentials: "include" });
  if (!response.ok) throw new Error("Panier HTTP " + response.status);
  const json = await response.json();
  const mini = json && json.minicart;
  if (!mini || !Array.isArray(mini.items)) throw new Error("Contrat minicart absent");
  return {
    total: mini.info && mini.info.cartProductTotal,
    items: mini.items.map((item) => ({ article_id: item.articleItemId, name: item.title, quantity: item.count, price: item.price })),
  };
};
`;

function searchExpression(query: string, limit: number): string {
  return String.raw`(async () => {
    ${PRELUDE}
    const response = await fetch("/recherche?keyword=" + encodeURIComponent(${JSON.stringify(query)}), { credentials: "include" });
    if (!response.ok) throw new Error("Recherche HTTP " + response.status);
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const cards = Array.prototype.slice.call(doc.querySelectorAll('li[is="product-card"]'));
    if (!cards.length) {
      if (!/0 r[ée]sultat|pas de r[ée]sultat|aucun r[ée]sultat/i.test(clean((doc.querySelector("h1") || {}).textContent))) throw new Error("Contrat liste produits absent");
      return [];
    }
    const items = cards.slice(0, ${limit}).map((card) => {
      let data = {};
      try { data = JSON.parse(card.getAttribute("data-json") || "{}"); } catch (error) { data = {}; }
      const link = card.querySelector("a[href*='sai=']");
      const price = card.querySelector(".price, .main-price, [class*='price']");
      const unit = card.querySelector(".unit-price, [class*='unit'], [class*='base-price']");
      return { sai: link ? saiOf(link.getAttribute("href")) : null, url: link ? new URL(link.getAttribute("href"), location.origin).toString() : null, name: data.name || null, brand: data.brand || null, price: price ? clean(price.textContent) : null, unit_price: unit ? clean(unit.textContent) : null, limit: null };
    });
    await Promise.all(items.filter((item) => item.sai).map(async (item) => { try { item.limit = (await stockOf(item.sai)).limit; } catch (error) { item.limit = null; } }));
    return items;
  })()`;
}

function productExpression(productUrl: string): string {
  return String.raw`(async () => {
    ${PRELUDE}
    const target = new URL(${JSON.stringify(productUrl)});
    const response = await fetch(target.pathname + target.search, { credentials: "include" });
    if (!response.ok) throw new Error("Fiche HTTP " + response.status);
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    let product = null;
    for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const json = JSON.parse(script.textContent);
        const found = (Array.isArray(json) ? json : (json["@graph"] || [json])).find((entry) => entry && entry["@type"] === "Product");
        if (found) { product = found; break; }
      } catch (error) { /* bloc JSON-LD non exploitable */ }
    }
    if (!product) throw new Error("Contrat JSON-LD Product absent");
    const idInput = doc.querySelector("input[name='ShopArticleItem_ID'], input[name='sai']");
    const sai = saiOf(target.toString()) || (idInput ? idInput.value : null) || (doc.querySelector("stateful-add-to-cart") || { getAttribute() { return null; } }).getAttribute("article-item-id");
    const stock = sai ? await stockOf(sai) : null;
    const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
    let ingredients = null;
    for (const element of Array.prototype.slice.call(doc.querySelectorAll("h2, h3, h4, strong, dt, p, div, li, span")).reverse()) {
      const text = clean(element.textContent);
      if (/^ingr[ée]dients?\b\s*[:\-]?\s*\S/i.test(text) && text.length < 4000 && element.children.length < 6) { ingredients = text.replace(/^ingr[ée]dients?\b\s*[:\-]?\s*/i, ""); break; }
    }
    return {
      sai: sai, name: product.name, brand: product.brand && (product.brand.name || product.brand) || null, description: product.description || "",
      gtin: product.gtin13 || product.gtin || product.gtin14 || null, price: offer && offer.price, availability: offer && offer.availability || null,
      limit: stock ? stock.limit : null, ingredients: ingredients,
    };
  })()`;
}

function cartExpression(): string {
  return String.raw`(async () => { ${PRELUDE} return readCart(); })()`;
}

function mutationExpression(input: MutationInput): string {
  return String.raw`(async () => {
    ${PRELUDE}
    const articleId = ${JSON.stringify(input.productId)};
    const target = ${input.targetQuantity};
    const before = await readCart();
    const line = before.items.find((item) => String(item.article_id) === articleId);
    const current = line ? Number(line.quantity) : 0;
    if (current === target) return { before, after: before, applied: false };
    const response = await fetch("/ajax/product-cart-action", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ count: target, articleItemId: Number(articleId) }) });
    if (!response.ok) throw new Error("Panier refusé HTTP " + response.status);
    const json = await response.json();
    if (Number(json.count) !== target) throw new Error("Quantité acceptée par le site : " + json.count + " au lieu de " + target + " (limite " + json.limit + ")");
    return { before, after: await readCart(), applied: true };
  })()`;
}

export const adapter: Adapter = {
  entryUrl: () => "https://www.piccantino.fr/",
  matchesTab: (u) => u.protocol === "https:" && HOSTS.has(u.hostname),
  inspectSession({ snapshot, tabUrl }): SessionSignals {
    let onSite = false;
    try { onSite = HOSTS.has(new URL(tabUrl).hostname); } catch { onSite = false; }
    const robotVisible = ROBOT_PATTERN.test(snapshot);
    return { ready: onSite && !robotVisible && snapshot.trim().length > 0, robotVisible, accountConnected: /d[ée]connexion|se d[ée]connecter/i.test(snapshot) };
  },
  validateProductUrl(u) {
    if (u.protocol !== "https:" || !HOSTS.has(u.hostname) || u.pathname === "/") throw new Error("Hors des fiches produit Piccantino.");
  },
  searchExpression: (_config, query, limit) => searchExpression(query, limit),
  normalizeSearch(raw): SummaryInput[] {
    if (!Array.isArray(raw)) throw new ContractChangedError("La recherche n’a pas retourné une liste de produits.");
    return raw.map((entry): SummaryInput => {
      if (!isObject(entry)) throw new ContractChangedError("Un produit n’est plus un objet exploitable.");
      const id = str(entry, "sai");
      const name = str(entry, "name");
      const priceText = str(entry, "price") ?? "";
      const price = parsePrice(/(\d[\d\s]*[.,]\d{2})\s*€/.exec(priceText)?.[1] ?? null);
      const perUnit = /\(([^)]*€[^)]*)\)/.exec(priceText)?.[1]?.replace(/\s+/g, " ").trim() ?? null;
      const url = str(entry, "url");
      if (!id || !name || price === null || !url) throw new ContractChangedError("Un produit ne contient plus son identifiant d’article, son nom, son prix ou son adresse.");
      const limit = typeof entry.limit === "number" && Number.isInteger(entry.limit) && entry.limit >= 0 ? entry.limit : null;
      return {
        product_id: id, name: decodeHtml(name), brand: str(entry, "brand"), price, unit_price: perUnit,
        availability: limit === null ? "unknown" : limit > 0 ? "available" : "out_of_stock", available_quantity: limit, organic: isOrganic(name), product_url: url,
      };
    });
  },
  productExpression: (_config, productUrl) => productExpression(productUrl),
  normalizeProduct(raw, _config, requestedUrl): ProductInput {
    if (!isObject(raw)) throw new ContractChangedError("La fiche n’a pas retourné l’objet produit attendu.");
    const id = str(raw, "sai");
    const name = str(raw, "name");
    const price = parsePrice(raw.price);
    const limit = typeof raw.limit === "number" && Number.isInteger(raw.limit) && raw.limit >= 0 ? raw.limit : null;
    if (!id || !name || price === null || limit === null) throw new ContractChangedError("La fiche ne contient plus son identifiant d’article, son nom, son prix ou son stock.");
    const text = `${name} ${stripTags(str(raw, "description") ?? "")}`;
    return {
      product_id: id, name: decodeHtml(name), brand: str(raw, "brand"), price, unit_price: null,
      availability: limit > 0 ? "available" : "out_of_stock", available_quantity: limit, organic: isOrganic(text), product_url: requestedUrl,
      ean: str(raw, "gtin"), ingredients: str(raw, "ingredients"), vegan_claim: hasVeganClaim(text), nutrition: [],
    };
  },
  cartExpression: () => cartExpression(),
  normalizeCart(raw): CartInput {
    if (!isObject(raw) || !Array.isArray(raw.items)) throw new ContractChangedError("Le panier n’a plus la forme observée.");
    const items = raw.items.map((entry) => {
      if (!isObject(entry)) throw new ContractChangedError("Une ligne de panier n’est plus exploitable.");
      const id = str(entry, "article_id");
      const quantity = Number(entry.quantity);
      if (!id || !Number.isInteger(quantity) || quantity < 0) throw new ContractChangedError("Une ligne de panier ne contient plus son identifiant ou sa quantité.");
      const unit = parsePrice(stripTags(str(entry, "price") ?? ""));
      return { product_id: id, name: str(entry, "name"), quantity, available_quantity: null, unit_price: unit, line_total: unit === null ? null : Math.round(unit * quantity * 100) / 100 };
    });
    const total = parsePrice(stripTags(str(raw, "total") ?? ""));
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    return { empty: totalQuantity === 0, total_quantity: totalQuantity, total_price: formatEuro(total ?? 0), items };
  },
  mutationExpression: (_config, input) => mutationExpression(input),
};
