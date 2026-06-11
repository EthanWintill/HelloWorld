import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Platform } from 'react-native'
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  LOG_LEVEL,
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type CustomerInfoUpdateListener,
  type IntroEligibility,
  type PurchasesOfferings,
  type PurchasesPackage,
} from 'react-native-purchases'
import RevenueCatUI from 'react-native-purchases-ui'
import {
  REVENUECAT_API_KEY,
  REVENUECAT_DISABLED_MESSAGE,
  REVENUECAT_ENTITLEMENT_ID,
  REVENUECAT_IS_ENABLED,
  REVENUECAT_PRODUCT_IDS,
} from '@/constants/revenuecat'

type RevenueCatUser = {
  id?: number | string | null
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  phone_number?: string | null
  is_staff?: boolean | null
  org?: {
    id?: number | string | null
    name?: string | null
    revenuecat_app_user_id?: string | null
  } | null
}

type RevenueCatContextType = {
  customerInfo: CustomerInfo | null
  currentOffering: PurchasesOfferings['current']
  error: string | null
  isConfigured: boolean
  isGreekGeekPro: boolean
  isLoading: boolean
  identifyUser: (user: RevenueCatUser) => Promise<void>
  openCustomerCenter: () => Promise<void>
  proIntroEligibility: IntroEligibility | null
  proPackage: PurchasesPackage | null
  purchaseProPackage: () => Promise<CustomerInfo | null>
  refreshOfferings: () => Promise<PurchasesOfferings | null>
  refreshCustomerInfo: () => Promise<CustomerInfo | null>
  resetUser: () => Promise<void>
  restorePurchases: () => Promise<CustomerInfo | null>
}

const RevenueCatContext = createContext<RevenueCatContextType | undefined>(undefined)

const messageFromError = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return fallback
}

const hasGreekGeekPro = (customerInfo: CustomerInfo | null) => {
  return Boolean(customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_ID])
}

const selectGreekGeekProPackage = (offerings: PurchasesOfferings | null) => {
  const offering = offerings?.current
  if (!offering) return null

  return offering.annual
    ?? offering.availablePackages.find((aPackage) => aPackage.product.identifier === REVENUECAT_PRODUCT_IDS.yearly)
    ?? offering.availablePackages.find((aPackage) => aPackage.identifier === REVENUECAT_PRODUCT_IDS.yearly)
    ?? offering.availablePackages.find((aPackage) => aPackage.packageType === PACKAGE_TYPE.ANNUAL)
    ?? offering.availablePackages[0]
    ?? null
}

const isUserCancelledPurchase = (error: unknown) => {
  if (!error || typeof error !== 'object') return false

  const maybeError = error as { code?: unknown; userCancelled?: unknown }
  return maybeError.userCancelled === true
    || maybeError.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR
}

const formatIntroDuration = (introPrice: PurchasesPackage['product']['introPrice']) => {
  if (!introPrice) return '1 month'

  const unit = introPrice.periodUnit.toLowerCase()
  const unitLabel = introPrice.periodNumberOfUnits === 1 ? unit : `${unit}s`
  return `${introPrice.periodNumberOfUnits} ${unitLabel}`
}

export const buildProPurchaseCopy = (
  proPackage: PurchasesPackage | null,
  proIntroEligibility: IntroEligibility | null
) => {
  const price = proPackage?.product.priceString
  const period = proPackage?.product.subscriptionPeriod === 'P1Y' ? 'per year' : 'subscription'
  const introPrice = proPackage?.product.introPrice ?? null
  const introDuration = formatIntroDuration(introPrice)
  const hasFreeIntroOffer = introPrice?.price === 0
  const introStatus = proIntroEligibility?.status
  const isIntroEligible = introStatus === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
  const billingCopy = price
    ? `Billed ${price} ${period} when you confirm with the App Store.`
    : 'Billing starts when you confirm with the App Store.'

  if (isIntroEligible && hasFreeIntroOffer) {
    return {
      buttonLabel: `Start ${introDuration} Free Trial`,
      offerBadge: `${introDuration} free`,
      priceCaption: price ? `then ${price} ${period}` : 'then yearly billing',
      terms: `${introDuration} free, then ${price ? `${price} ${period}` : 'the yearly subscription price'}. The App Store confirms final terms before purchase.`,
    }
  }

  if (introStatus === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE) {
    return {
      buttonLabel: price ? `Subscribe for ${price}` : 'Subscribe',
      offerBadge: null,
      priceCaption: price ? period : 'subscription',
      terms: `The free trial is not available for this App Store account. ${billingCopy}`,
    }
  }

  if (introStatus === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS) {
    return {
      buttonLabel: price ? `Subscribe for ${price}` : 'Subscribe',
      offerBadge: null,
      priceCaption: price ? period : 'subscription',
      terms: `This plan does not currently include an introductory free trial. ${billingCopy}`,
    }
  }

  return {
    buttonLabel: price ? `Subscribe for ${price}` : 'Subscribe',
    offerBadge: null,
    priceCaption: price ? period : 'subscription',
    terms: `Free trial eligibility could not be confirmed. ${billingCopy}`,
  }
}

export const RevenueCatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null)
  const [proIntroEligibility, setProIntroEligibility] = useState<IntroEligibility | null>(null)
  const configuredRef = useRef(false)
  const configurePromiseRef = useRef<Promise<boolean> | null>(null)
  const identifiedUserIdRef = useRef<string | null>(null)

  const ensureConfigured = useCallback(async () => {
    if (configuredRef.current) return true

    if (!REVENUECAT_IS_ENABLED) {
      configuredRef.current = false
      configurePromiseRef.current = null
      setCustomerInfo(null)
      setError(REVENUECAT_DISABLED_MESSAGE)
      setIsConfigured(false)
      setIsLoading(false)
      return false
    }

    if (!configurePromiseRef.current) {
      configurePromiseRef.current = (async () => {
        setIsLoading(true)
        try {
          const alreadyConfigured = await Purchases.isConfigured().catch(() => false)
          await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN)

          if (!alreadyConfigured) {
            Purchases.configure({ apiKey: REVENUECAT_API_KEY })
          }

          if (!__DEV__ && REVENUECAT_API_KEY.startsWith('test_')) {
            console.warn('RevenueCat is using a Test Store API key in a non-dev build.')
          }

          configuredRef.current = true
          setIsConfigured(true)
          const info = await Purchases.getCustomerInfo()
          setCustomerInfo(info)
          setError(null)
          return true
        } catch (configurationError) {
          const message = messageFromError(configurationError, 'RevenueCat could not be configured.')
          console.warn('RevenueCat configuration failed:', configurationError)
          configurePromiseRef.current = null
          configuredRef.current = false
          setIsConfigured(false)
          setError(message)
          return false
        } finally {
          setIsLoading(false)
        }
      })()
    }

    return configurePromiseRef.current
  }, [])

  useEffect(() => {
    let mounted = true
    let listener: CustomerInfoUpdateListener | null = null

    ensureConfigured().then((configured) => {
      if (!mounted || !configured) return

      listener = (info) => {
        setCustomerInfo(info)
        setError(null)
      }
      Purchases.addCustomerInfoUpdateListener(listener)
    })

    return () => {
      mounted = false
      if (listener) {
        Purchases.removeCustomerInfoUpdateListener(listener)
      }
    }
  }, [ensureConfigured])

  const refreshCustomerInfo = useCallback(async () => {
    const configured = await ensureConfigured()
    if (!configured) return null

    try {
      const info = await Purchases.getCustomerInfo()
      setCustomerInfo(info)
      setError(null)
      return info
    } catch (customerInfoError) {
      const message = messageFromError(customerInfoError, 'Could not refresh subscription status.')
      setError(message)
      throw customerInfoError
    }
  }, [ensureConfigured])

  const loadProIntroEligibility = useCallback(async (packageToCheck: PurchasesPackage | null) => {
    if (Platform.OS !== 'ios' || !packageToCheck?.product.identifier) {
      setProIntroEligibility(null)
      return null
    }

    const productId = packageToCheck.product.identifier
    try {
      const eligibilityByProduct = await Purchases.checkTrialOrIntroductoryPriceEligibility([productId])
      const eligibility = eligibilityByProduct[productId] ?? null
      setProIntroEligibility(eligibility)
      return eligibility
    } catch (eligibilityError) {
      console.warn('RevenueCat intro eligibility check failed:', eligibilityError)
      setProIntroEligibility(null)
      return null
    }
  }, [])

  const refreshOfferings = useCallback(async () => {
    const configured = await ensureConfigured()
    if (!configured) return null

    try {
      const nextOfferings = await Purchases.getOfferings()
      setOfferings(nextOfferings)
      await loadProIntroEligibility(selectGreekGeekProPackage(nextOfferings))
      setError(null)
      return nextOfferings
    } catch (offeringsError) {
      const message = messageFromError(offeringsError, 'Could not load subscription options.')
      setError(message)
      throw offeringsError
    }
  }, [ensureConfigured, loadProIntroEligibility])

  const identifyUser = useCallback(async (user: RevenueCatUser) => {
    if (!user.org?.revenuecat_app_user_id) return

    const configured = await ensureConfigured()
    if (!configured) return

    const appUserID = user.org.revenuecat_app_user_id
    if (identifiedUserIdRef.current === appUserID) return

    try {
      const result = await Purchases.logIn(appUserID)
      identifiedUserIdRef.current = appUserID
      setCustomerInfo(result.customerInfo)
      setProIntroEligibility(null)
      setError(null)

      const attributes: Record<string, string> = {
        org_id: String(user.org.id ?? ''),
      }
      if (user.org?.name) attributes.organization = user.org.name

      await Promise.all([
        Purchases.setEmail(user.is_staff ? user.email ?? null : null),
        Purchases.setDisplayName(user.org?.name ?? null),
        Purchases.setPhoneNumber(user.is_staff ? user.phone_number ?? null : null),
        Purchases.setAttributes(attributes),
      ].map((promise) => promise.catch((attributeError) => {
        console.warn('RevenueCat subscriber attribute update failed:', attributeError)
      })))
    } catch (loginError) {
      const message = messageFromError(loginError, 'Could not identify the RevenueCat customer.')
      setError(message)
      throw loginError
    }
  }, [ensureConfigured])

  const resetUser = useCallback(async () => {
    const configured = await ensureConfigured()
    if (!configured) return

    try {
      const info = await Purchases.logOut()
      identifiedUserIdRef.current = null
      setCustomerInfo(info)
      setProIntroEligibility(null)
      setError(null)
    } catch (logoutError) {
      const message = messageFromError(logoutError, 'Could not reset the RevenueCat customer.')
      setError(message)
      throw logoutError
    }
  }, [ensureConfigured])

  const proPackage = selectGreekGeekProPackage(offerings)

  const purchaseProPackage = useCallback(async () => {
    const configured = await ensureConfigured()
    if (!configured) return null

    try {
      const packageToPurchase = proPackage ?? selectGreekGeekProPackage(await refreshOfferings())
      if (!packageToPurchase) {
        throw new Error('GreekGeek Pro is not available for purchase yet.')
      }

      const { customerInfo: updatedInfo } = await Purchases.purchasePackage(packageToPurchase)
      setCustomerInfo(updatedInfo)
      setError(null)
      return updatedInfo
    } catch (purchaseError) {
      if (isUserCancelledPurchase(purchaseError)) {
        return null
      }

      const message = messageFromError(purchaseError, 'Could not complete the purchase.')
      setError(message)
      throw purchaseError
    }
  }, [ensureConfigured, proPackage, refreshOfferings])

  const restorePurchases = useCallback(async () => {
    const configured = await ensureConfigured()
    if (!configured) return null

    try {
      const info = await Purchases.restorePurchases()
      setCustomerInfo(info)
      setError(null)
      return info
    } catch (restoreError) {
      const message = messageFromError(restoreError, 'Could not restore purchases.')
      setError(message)
      throw restoreError
    }
  }, [ensureConfigured])

  const openCustomerCenter = useCallback(async () => {
    const configured = await ensureConfigured()
    if (!configured) return

    try {
      await RevenueCatUI.presentCustomerCenter({
        callbacks: {
          onRestoreCompleted: ({ customerInfo: restoredInfo }) => {
            setCustomerInfo(restoredInfo)
            setError(null)
          },
          onPromotionalOfferSucceeded: ({ customerInfo: updatedInfo }) => {
            setCustomerInfo(updatedInfo)
            setError(null)
          },
        },
      })
    } catch (customerCenterError) {
      const message = messageFromError(customerCenterError, 'Could not open subscription management.')
      setError(message)
      throw customerCenterError
    }
  }, [ensureConfigured])

  const value = useMemo(() => ({
    customerInfo,
    currentOffering: offerings?.current ?? null,
    error,
    isConfigured,
    isGreekGeekPro: hasGreekGeekPro(customerInfo),
    isLoading,
    identifyUser,
    openCustomerCenter,
    proIntroEligibility,
    proPackage,
    purchaseProPackage,
    refreshOfferings,
    refreshCustomerInfo,
    resetUser,
    restorePurchases,
  }), [
    customerInfo,
    error,
    identifyUser,
    isConfigured,
    isLoading,
    openCustomerCenter,
    offerings,
    proIntroEligibility,
    proPackage,
    purchaseProPackage,
    refreshOfferings,
    refreshCustomerInfo,
    resetUser,
    restorePurchases,
  ])

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  )
}

export const useRevenueCat = () => {
  const context = useContext(RevenueCatContext)
  if (context === undefined) {
    throw new Error('useRevenueCat must be used within a RevenueCatProvider')
  }
  return context
}
