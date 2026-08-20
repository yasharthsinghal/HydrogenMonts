import {
  MONEY_FRAGMENT,
  IMAGE_FRAGMENT,
  PRODUCT_CARD_FRAGMENT,
  PRODUCT_DETAIL_FRAGMENT,
  COLLECTION_CARD_FRAGMENT,
} from './StorefrontFragments';

export const HOMEPAGE_QUERY = `#graphql
  query Homepage(
    $country: CountryCode
    $language: LanguageCode
    $collectionsFirst: Int = 3
    $productsFirst: Int = 8
  ) @inContext(country: $country, language: $language) {
    shop {
      name
      description
    }
    collections(first: $collectionsFirst, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...CollectionCardFragment
      }
    }
    featuredProducts: products(first: $productsFirst, sortKey: BEST_SELLING) {
      nodes {
        ...ProductCardFragment
      }
    }
    allProducts: products(first: $productsFirst, sortKey: CREATED_AT, reverse: true) {
      nodes {
        ...ProductCardFragment
      }
    }
  }
  ${COLLECTION_CARD_FRAGMENT}
  ${PRODUCT_CARD_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${MONEY_FRAGMENT}
` as const;

export const COLLECTIONS_QUERY = `#graphql
  query Collections(
    $country: CountryCode
    $language: LanguageCode
    $first: Int = 20
  ) @inContext(country: $country, language: $language) {
    collections(first: $first, sortKey: TITLE) {
      nodes {
        ...CollectionCardFragment
      }
    }
  }
  ${COLLECTION_CARD_FRAGMENT}
  ${IMAGE_FRAGMENT}
` as const;

export const COLLECTION_BY_HANDLE_QUERY = `#graphql
  query CollectionByHandle(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int = 24
    $after: String
    $sortKey: ProductCollectionSortKeys = BEST_SELLING
    $reverse: Boolean = false
    $filters: [ProductFilter!]
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      image {
        ...ImageFragment
      }
      products(
        first: $first
        after: $after
        sortKey: $sortKey
        reverse: $reverse
        filters: $filters
      ) {
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
          startCursor
        }
        nodes {
          ...ProductCardFragment
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${MONEY_FRAGMENT}
` as const;

export const PRODUCT_BY_HANDLE_QUERY = `#graphql
  query ProductByHandle(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...ProductDetailFragment
    }
  }
  ${PRODUCT_DETAIL_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${MONEY_FRAGMENT}
` as const;

export const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  query RecommendedProducts(
    $productId: ID!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productId: $productId) {
      ...ProductCardFragment
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${MONEY_FRAGMENT}
` as const;

export const SEARCH_QUERY = `#graphql
  query SearchProducts(
    $query: String!
    $country: CountryCode
    $language: LanguageCode
    $first: Int = 24
  ) @inContext(country: $country, language: $language) {
    search(query: $query, first: $first, types: [PRODUCT]) {
      totalCount
      nodes {
        ... on Product {
          ...ProductCardFragment
        }
      }
    }
  }
  ${PRODUCT_CARD_FRAGMENT}
  ${IMAGE_FRAGMENT}
  ${MONEY_FRAGMENT}
` as const;
