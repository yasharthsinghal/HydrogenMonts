export interface MoneyV2 {
  amount: string;
  currencyCode: string;
}

export interface ImageNode {
  id?: string;
  url: string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface ProductVariantNode {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: SelectedOption[];
  image?: ImageNode | null;
  price: MoneyV2;
  compareAtPrice?: MoneyV2 | null;
  unitPrice?: MoneyV2 | null;
  sku?: string | null;
}

export interface ProductCardItem {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  publishedAt: string;
  featuredImage?: ImageNode | null;
  images?: {
    nodes: ImageNode[];
  };
  priceRange: {
    minVariantPrice: MoneyV2;
    maxVariantPrice?: MoneyV2;
  };
  compareAtPriceRange?: {
    minVariantPrice: MoneyV2;
    maxVariantPrice?: MoneyV2;
  };
  variants: {
    nodes: ProductVariantNode[];
  };
}

export interface CollectionCardItem {
  id: string;
  title: string;
  handle: string;
  description: string;
  image?: ImageNode | null;
  products?: {
    totalCount?: number;
  };
}

export interface ProductDetailItem {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  description: string;
  descriptionHtml: string;
  tags: string[];
  options: {
    name: string;
    values: string[];
  }[];
  featuredImage?: ImageNode | null;
  media: {
    nodes: {
      id: string;
      mediaContentType: string;
      image?: ImageNode | null;
    }[];
  };
  priceRange: {
    minVariantPrice: MoneyV2;
  };
  compareAtPriceRange?: {
    minVariantPrice: MoneyV2;
  };
  variants: {
    nodes: ProductVariantNode[];
  };
  seo?: {
    title?: string | null;
    description?: string | null;
  };
}
