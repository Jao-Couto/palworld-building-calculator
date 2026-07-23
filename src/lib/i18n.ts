import type { Language, LocalizedName } from './types';

export const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'ptBR', label: 'PT-BR' },
];

/** Falls back to English, then to the raw item id, for untranslated entries. */
export function resolveName(name: LocalizedName, lang: Language, fallbackId: string): string {
  return name[lang] ?? name.en ?? fallbackId;
}

/**
 * Rarity is a bare 0-4 integer in the source data with no label table -
 * standard Palworld rarity tiers, hardcoded here since the game data doesn't
 * name them. Anything outside that range (5, 99, sentinel values on cut
 * content) falls back to a generic "Special" label.
 */
const RARITY_LABELS: Record<Language, Record<number, string>> = {
  en: { 0: 'Common', 1: 'Uncommon', 2: 'Rare', 3: 'Epic', 4: 'Legendary' },
  ptBR: { 0: 'Comum', 1: 'Incomum', 2: 'Raro', 3: 'Épico', 4: 'Lendário' },
};

const SPECIAL_RARITY_LABEL: Record<Language, string> = {
  en: 'Special',
  ptBR: 'Especial',
};

export function rarityLabel(rarity: number | null | undefined, lang: Language): string | null {
  if (rarity == null) return null;
  return RARITY_LABELS[lang][rarity] ?? SPECIAL_RARITY_LABEL[lang];
}

export interface UiText {
  title: string;
  description: string;
  views: {
    calculator: string;
    catalog: string;
  };
  sections: {
    item: { label: string; labelPlural: string; placeholder: string };
    building: { label: string; labelPlural: string; placeholder: string };
  };
  cart: {
    heading: string;
    clear: string;
    empty: string;
    removeAriaLabel: (name: string) => string;
  };
  selector: {
    noResults: string;
    quantity: string;
    addToCart: string;
  };
  results: {
    rawMaterialsTitle: string;
    rawMaterialsEmpty: string;
    intermediatesTitle: string;
    intermediatesEmpty: string;
  };
  catalog: {
    searchLabel: string;
    searchPlaceholder: string;
    typeLabel: string;
    rarityLabel: string;
    sortLabel: string;
    orderLabel: string;
    all: string;
    sortName: string;
    sortPrice: string;
    sortRarity: string;
    orderAsc: string;
    orderDesc: string;
    noResults: string;
    price: string;
    recipe: string;
    rawMaterial: string;
    favoritesOnly: string;
    clearFilters: string;
    recentTitle: string;
    resultsCount: (n: number) => string;
    suggestionsAria: string;
  };
  theme: {
    toLight: string;
    toDark: string;
    toggleAria: string;
  };
  card: {
    addToCart: string;
    quantity: string;
    favorite: string;
    unfavorite: string;
    openDetails: string;
  };
  detail: {
    close: string;
    description: string;
    noDescription: string;
    whereToCraft: string;
    craftTree: string;
    noRecipe: string;
    base: string;
    yields: (n: number) => string;
  };
  toast: {
    added: (name: string, qty: number) => string;
  };
  quantityList: {
    itemsCount: (n: number) => string;
    sortByQuantity: string;
    sortByName: string;
    copyList: string;
    copied: string;
  };
}

export const UI_TEXT: Record<Language, UiText> = {
  en: {
    title: 'Palworld Building Calculator',
    description:
      'Add items and buildings to the cart to see the total raw materials and intermediates needed to craft everything, recipes expanded recursively.',
    views: {
      calculator: 'Calculator',
      catalog: 'Catalog',
    },
    sections: {
      item: { label: 'Item', labelPlural: 'Items', placeholder: 'Search a craftable item…' },
      building: {
        label: 'Building',
        labelPlural: 'Buildings',
        placeholder: 'Search a buildable structure…',
      },
    },
    cart: {
      heading: 'Cart',
      clear: 'Clear',
      empty: 'No items yet. Search an item or building and add it to the cart.',
      removeAriaLabel: (name) => `Remove ${name} from cart`,
    },
    selector: {
      noResults: 'No matching results.',
      quantity: 'Qty',
      addToCart: 'Add to cart',
    },
    results: {
      rawMaterialsTitle: 'Raw materials needed',
      rawMaterialsEmpty: 'Add something to the cart to see the raw materials needed.',
      intermediatesTitle: 'Intermediates needed',
      intermediatesEmpty: 'Add something to the cart to see the intermediates needed.',
    },
    catalog: {
      searchLabel: 'Search item',
      searchPlaceholder: 'Type a name…',
      typeLabel: 'Item type',
      rarityLabel: 'Rarity',
      sortLabel: 'Sort by',
      orderLabel: 'Order',
      all: 'All',
      sortName: 'Name',
      sortPrice: 'Price',
      sortRarity: 'Rarity',
      orderAsc: 'Ascending',
      orderDesc: 'Descending',
      noResults: 'No items match these filters.',
      price: 'Price',
      recipe: 'Recipe',
      rawMaterial: 'Raw material',
      favoritesOnly: 'Favorites',
      clearFilters: 'Clear filters',
      recentTitle: 'Recently viewed',
      resultsCount: (n) => `${n} item${n === 1 ? '' : 's'}`,
      suggestionsAria: 'Search suggestions',
    },
    theme: {
      toLight: 'Light',
      toDark: 'Dark',
      toggleAria: 'Toggle light/dark theme',
    },
    card: {
      addToCart: 'Add to cart',
      quantity: 'Qty',
      favorite: 'Add to favorites',
      unfavorite: 'Remove from favorites',
      openDetails: 'View details',
    },
    detail: {
      close: 'Close',
      description: 'Description',
      noDescription: 'No description available.',
      whereToCraft: 'Where to craft',
      craftTree: 'Crafting tree',
      noRecipe: 'This is a raw material — no recipe.',
      base: 'Raw material',
      yields: (n) => `yields ${n}`,
    },
    toast: {
      added: (name, qty) => `Added ${qty}× ${name} to cart`,
    },
    quantityList: {
      itemsCount: (n) => `${n} item${n === 1 ? '' : 's'}`,
      sortByQuantity: 'Quantity',
      sortByName: 'Name (A-Z)',
      copyList: 'Copy list',
      copied: 'List copied',
    },
  },
  ptBR: {
    title: 'Calculadora de Construção do Palworld',
    description:
      'Adicione itens e construções ao carrinho para ver o total de matérias-primas e intermediários necessários para fabricar tudo, com as receitas expandidas recursivamente.',
    views: {
      calculator: 'Calculadora',
      catalog: 'Catálogo',
    },
    sections: {
      item: { label: 'Item', labelPlural: 'Itens', placeholder: 'Buscar um item fabricável…' },
      building: {
        label: 'Construção',
        labelPlural: 'Construções',
        placeholder: 'Buscar uma estrutura construível…',
      },
    },
    cart: {
      heading: 'Carrinho',
      clear: 'Limpar',
      empty: 'Nenhum item ainda. Busque um item ou construção e adicione ao carrinho.',
      removeAriaLabel: (name) => `Remover ${name} do carrinho`,
    },
    selector: {
      noResults: 'Nenhum resultado encontrado.',
      quantity: 'Qtd',
      addToCart: 'Adicionar ao carrinho',
    },
    results: {
      rawMaterialsTitle: 'Matérias-primas necessárias',
      rawMaterialsEmpty: 'Adicione algo ao carrinho para ver as matérias-primas necessárias.',
      intermediatesTitle: 'Intermediários necessários',
      intermediatesEmpty: 'Adicione algo ao carrinho para ver os intermediários necessários.',
    },
    catalog: {
      searchLabel: 'Procurar item',
      searchPlaceholder: 'Digite o nome…',
      typeLabel: 'Tipo de Item',
      rarityLabel: 'Raridade',
      sortLabel: 'Ordenar',
      orderLabel: 'Ordem',
      all: 'Todos',
      sortName: 'Nome',
      sortPrice: 'Preço',
      sortRarity: 'Raridade',
      orderAsc: 'Crescente',
      orderDesc: 'Decrescente',
      noResults: 'Nenhum item corresponde a esses filtros.',
      price: 'Preço',
      recipe: 'Receita',
      rawMaterial: 'Matéria-prima',
      favoritesOnly: 'Favoritos',
      clearFilters: 'Limpar filtros',
      recentTitle: 'Vistos recentemente',
      resultsCount: (n) => `${n} ${n === 1 ? 'item' : 'itens'}`,
      suggestionsAria: 'Sugestões de busca',
    },
    theme: {
      toLight: 'Claro',
      toDark: 'Escuro',
      toggleAria: 'Alternar tema claro/escuro',
    },
    card: {
      addToCart: 'Adicionar ao carrinho',
      quantity: 'Qtd',
      favorite: 'Adicionar aos favoritos',
      unfavorite: 'Remover dos favoritos',
      openDetails: 'Ver detalhes',
    },
    detail: {
      close: 'Fechar',
      description: 'Descrição',
      noDescription: 'Sem descrição disponível.',
      whereToCraft: 'Onde fabricar',
      craftTree: 'Árvore de fabricação',
      noRecipe: 'Isto é uma matéria-prima — sem receita.',
      base: 'Matéria-prima',
      yields: (n) => `rende ${n}`,
    },
    toast: {
      added: (name, qty) => `${qty}× ${name} adicionado(s) ao carrinho`,
    },
    quantityList: {
      itemsCount: (n) => `${n} ${n === 1 ? 'item' : 'itens'}`,
      sortByQuantity: 'Quantidade',
      sortByName: 'Nome (A-Z)',
      copyList: 'Copiar lista',
      copied: 'Lista copiada',
    },
  },
};
