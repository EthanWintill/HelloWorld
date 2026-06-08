const revenueCatEnvKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim() ?? ''
const revenueCatDisabledFlag = process.env.EXPO_PUBLIC_REVENUECAT_DISABLED?.trim().toLowerCase() ?? ''

export const REVENUECAT_TEST_STORE_API_KEY = 'test_EuJhLcAOLnzNsnphmmJRDqasnkF'

export const REVENUECAT_API_KEY = revenueCatEnvKey || (__DEV__ ? REVENUECAT_TEST_STORE_API_KEY : '')
export const REVENUECAT_IS_TEST_STORE_KEY = REVENUECAT_API_KEY.startsWith('test_')
export const REVENUECAT_IS_DISABLED = ['1', 'true', 'yes'].includes(revenueCatDisabledFlag)
export const REVENUECAT_IS_ENABLED = Boolean(REVENUECAT_API_KEY)
  && !REVENUECAT_IS_DISABLED
  && (__DEV__ || !REVENUECAT_IS_TEST_STORE_KEY)
export const REVENUECAT_DISABLED_MESSAGE = REVENUECAT_IS_DISABLED
  ? 'App Store subscriptions are disabled for this build.'
  : REVENUECAT_API_KEY
    ? 'App Store subscriptions are disabled until a production RevenueCat App Store key is configured.'
    : 'App Store subscriptions are not configured for this build.'

export const REVENUECAT_ENTITLEMENT_ID = 'GreekGeek Pro'

export const REVENUECAT_PRODUCT_IDS = {
  yearly: 'yearly',
} as const
