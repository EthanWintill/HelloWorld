import { useCallback, useMemo, useState } from 'react'
import { Alert } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { API_URL } from '@/constants'
import { REVENUECAT_ENTITLEMENT_ID, REVENUECAT_PRODUCT_IDS } from '@/constants/revenuecat'
import { useDashboard } from '@/context/DashboardContext'
import { useRevenueCat } from '@/context/RevenueCatContext'

export type SubscriptionAction = 'paywall' | 'restore' | null

const revenueCatEntitlementIsCurrent = (org: any) => {
  const expiresAt = org?.revenuecat_entitlement_expires_at
    ? new Date(org.revenuecat_entitlement_expires_at)
    : null

  return org?.revenuecat_subscription_status === 'active'
    && (!expiresAt || expiresAt > new Date())
}

export const useOrgSubscriptionGate = () => {
  const { dashboardState, refreshDashboard } = useDashboard()
  const {
    customerInfo,
    error: revenueCatError,
    isGreekGeekPro,
    isLoading: revenueCatLoading,
    proPackage,
    purchaseProPackage,
    refreshOfferings,
    restorePurchases,
  } = useRevenueCat()
  const { data } = dashboardState
  const org = data?.org
  const webSubscriptionStatus = org?.stripe_subscription_status || ''
  const hasWebBillingAccess = ['active', 'trialing'].includes(webSubscriptionStatus)
  const hasOrgPremiumAccess = Boolean(
    org?.is_premium
    || hasWebBillingAccess
    || isGreekGeekPro
    || revenueCatEntitlementIsCurrent(org)
  )
  const isOrgAdmin = Boolean(data?.is_staff && org)
  const shouldGateAdmin = isOrgAdmin && !hasOrgPremiumAccess
  const [paywallVisible, setPaywallVisible] = useState(false)
  const [subscriptionAction, setSubscriptionAction] = useState<SubscriptionAction>(null)

  const proEntitlement = customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_ID] ?? null
  const proProductIdentifier = proEntitlement?.productIdentifier
    || org?.revenuecat_product_id
    || proPackage?.product.identifier
    || customerInfo?.activeSubscriptions.find((productId) => productId === REVENUECAT_PRODUCT_IDS.yearly)
    || customerInfo?.activeSubscriptions[0]
    || REVENUECAT_PRODUCT_IDS.yearly
  const proPrice = proPackage?.product.priceString
  const proTitle = proPackage?.product.title || 'GreekGeek Pro'
  const proDescription = proPackage?.product.description || 'Organization-wide Pro access for your chapter.'

  const syncWebBillingBeforePaywall = useCallback(async () => {
    const token = await AsyncStorage.getItem('accessToken')
    if (!token) throw new Error('No access token found')

    const response = await axios.post(
      `${API_URL}api/billing/sync-subscription/`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    if (response.data?.billing?.is_premium) {
      await refreshDashboard().catch((error) => {
        console.warn('Dashboard refresh after billing sync failed:', error)
      })
      Alert.alert('GreekGeek Pro', 'Your organization already has Pro access.')
      return true
    }

    return false
  }, [refreshDashboard])

  const openPaywall = useCallback(async () => {
    if (!isOrgAdmin) return

    setSubscriptionAction('paywall')
    try {
      const alreadyPremium = await syncWebBillingBeforePaywall()
      if (alreadyPremium) return

      setPaywallVisible(true)
      await refreshOfferings().catch((error) => {
        console.warn('RevenueCat offerings failed:', error)
      })
    } catch (error) {
      console.warn('Billing sync before paywall failed:', error)
      Alert.alert('Subscription unavailable', 'Could not verify organization billing. Please try again.')
    } finally {
      setSubscriptionAction(null)
    }
  }, [isOrgAdmin, refreshOfferings, syncWebBillingBeforePaywall])

  const closePaywall = useCallback(() => {
    setPaywallVisible(false)
  }, [])

  const purchasePro = useCallback(async () => {
    setSubscriptionAction('paywall')
    try {
      const alreadyPremium = await syncWebBillingBeforePaywall()
      if (alreadyPremium) {
        setPaywallVisible(false)
        return
      }

      const info = await purchaseProPackage()
      if (!info) return

      if (info.entitlements.active[REVENUECAT_ENTITLEMENT_ID]) {
        await refreshDashboard().catch((error) => {
          console.warn('Dashboard refresh after RevenueCat purchase failed:', error)
        })
        setPaywallVisible(false)
        Alert.alert('GreekGeek Pro', 'Your Pro access is active.')
      } else {
        Alert.alert('Purchase pending', 'Your purchase is processing. GreekGeek Pro will unlock when the store confirms it.')
      }
    } catch (error) {
      Alert.alert('Purchase failed', 'Could not complete the purchase. Please try again.')
    } finally {
      setSubscriptionAction(null)
    }
  }, [purchaseProPackage, refreshDashboard, syncWebBillingBeforePaywall])

  const restorePro = useCallback(async () => {
    setSubscriptionAction('restore')
    try {
      const info = await restorePurchases()
      if (info?.entitlements.active[REVENUECAT_ENTITLEMENT_ID]) {
        await refreshDashboard().catch((error) => {
          console.warn('Dashboard refresh after RevenueCat restore failed:', error)
        })
        setPaywallVisible(false)
        Alert.alert('Restored', 'GreekGeek Pro is active for this account.')
      } else {
        Alert.alert('No purchases found', 'No active GreekGeek Pro subscription was found for this store account.')
      }
    } catch (error) {
      Alert.alert('Restore failed', 'Could not restore purchases. Please try again.')
    } finally {
      setSubscriptionAction(null)
    }
  }, [refreshDashboard, restorePurchases])

  return useMemo(() => ({
    closePaywall,
    data,
    hasOrgPremiumAccess,
    isOrgAdmin,
    openPaywall,
    org,
    paywallVisible,
    proDescription,
    proPackage,
    proPrice,
    proProductIdentifier,
    proTitle,
    purchasePro,
    restorePro,
    revenueCatError,
    revenueCatLoading,
    shouldGateAdmin,
    subscriptionAction,
  }), [
    closePaywall,
    data,
    hasOrgPremiumAccess,
    isOrgAdmin,
    openPaywall,
    org,
    paywallVisible,
    proDescription,
    proPackage,
    proPrice,
    proProductIdentifier,
    proTitle,
    purchasePro,
    restorePro,
    revenueCatError,
    revenueCatLoading,
    shouldGateAdmin,
    subscriptionAction,
  ])
}

export type OrgSubscriptionGate = ReturnType<typeof useOrgSubscriptionGate>
