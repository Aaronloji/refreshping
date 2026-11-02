// RefreshPing - product config. Fill these after creating the Pro product in Lemon Squeezy.
// Keys from other stores/products are rejected when these are set.
self.RP_CONFIG = {
  STORE_ID: null,        // e.g. 123456  (Lemon Squeezy > Settings > Stores)
  PRODUCT_ID: null,      // e.g. 654321  (Products > RefreshPing Pro)
  CHECKOUT_URL: 'https://stackbit.lemonsqueezy.com/', // replace with the product's checkout link
  API: 'https://api.lemonsqueezy.com/v1/licenses',
  REVALIDATE_DAYS: 7
};
