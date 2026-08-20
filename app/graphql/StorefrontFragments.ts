export const MONEY_FRAGMENT = `#graphql
  fragment MoneyFragment on MoneyV2 {
    amount
    currencyCode
  }
` as const;

export const IMAGE_FRAGMENT = `#graphql
  fragment ImageFragment on Image {
    id
    url
    altText
    width
    height
  }
` as const;

export const PRODUCT_CARD_FRAGMENT = `#graphql
  fragment ProductCardFragment on Product {
    id
    title
    handle
    vendor
    publishedAt
    featuredImage {
      ...ImageFragment
    }
    images(first: 2) {
      nodes {
        ...ImageFragment
      }
    }
    priceRange {
      minVariantPrice {
        ...MoneyFragment
      }
      maxVariantPrice {
        ...MoneyFragment
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...MoneyFragment
      }
      maxVariantPrice {
        ...MoneyFragment
      }
    }
    variants(first: 10) {
      nodes {
        id
        title
        availableForSale
        price {
          ...MoneyFragment
        }
        compareAtPrice {
          ...MoneyFragment
        }
        selectedOptions {
          name
          value
        }
      }
    }
  }
` as const;

export const COLLECTION_CARD_FRAGMENT = `#graphql
  fragment CollectionCardFragment on Collection {
    id
    title
    handle
    description
    image {
      ...ImageFragment
    }
  }
` as const;

export const PRODUCT_DETAIL_FRAGMENT = `#graphql
  fragment ProductDetailFragment on Product {
    id
    title
    handle
    vendor
    description
    descriptionHtml
    tags
    options {
      name
      values
    }
    featuredImage {
      ...ImageFragment
    }
    media(first: 10) {
      nodes {
        ... on MediaImage {
          id
          mediaContentType
          image {
            ...ImageFragment
          }
        }
      }
    }
    priceRange {
      minVariantPrice {
        ...MoneyFragment
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...MoneyFragment
      }
    }
    variants(first: 50) {
      nodes {
        id
        title
        availableForSale
        selectedOptions {
          name
          value
        }
        image {
          ...ImageFragment
        }
        price {
          ...MoneyFragment
        }
        compareAtPrice {
          ...MoneyFragment
        }
        unitPrice {
          ...MoneyFragment
        }
        sku
      }
    }
    seo {
      title
      description
    }
  }
` as const;
