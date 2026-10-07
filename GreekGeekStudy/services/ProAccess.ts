import type { CustomerInfo } from 'react-native-purchases'
import { REVENUECAT_ENTITLEMENT_ID, REVENUECAT_PRODUCT_IDS } from '@/constants/revenuecat'

export const hasProAccess = (info: CustomerInfo | null) => Boolean(
  info?.entitlements.active[REVENUECAT_ENTITLEMENT_ID]
  || info?.activeSubscriptions.includes(REVENUECAT_PRODUCT_IDS.yearly)
)
