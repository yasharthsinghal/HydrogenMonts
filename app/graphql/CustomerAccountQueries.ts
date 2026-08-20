export const CUSTOMER_DETAILS_QUERY = `#graphql
  query CustomerDetails {
    customer {
      id
      firstName
      lastName
      phoneNumber {
        phoneNumber
      }
      emailAddress {
        emailAddress
      }
      defaultAddress {
        id
        formatted
        firstName
        lastName
        company
        address1
        address2
        city
        zoneCode
        zip
        phoneNumber
      }
      addresses(first: 10) {
        nodes {
          id
          formatted
          firstName
          lastName
          company
          address1
          address2
          city
          zoneCode
          zip
          phoneNumber
        }
      }
      orders(first: 20, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          name
          number
          processedAt
          financialStatus
          fulfillmentStatus
          totalPrice {
            amount
            currencyCode
          }
          lineItems(first: 10) {
            nodes {
              title
              quantity
              variantTitle
              image {
                url
                altText
              }
              price {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
` as const;
