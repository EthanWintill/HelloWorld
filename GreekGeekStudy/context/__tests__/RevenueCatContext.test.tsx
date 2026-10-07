/// <reference types="jest" />
import React from 'react'
import { act, create } from 'react-test-renderer'
import Purchases from 'react-native-purchases'
import { RevenueCatProvider, useRevenueCat } from '../RevenueCatContext'
import { syncPurchasedOrganization } from '@/services/SubscriptionSync'

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
jest.mock('react-native-purchases-ui', () => ({ presentCustomerCenter: jest.fn() }))
jest.mock('@/services/SubscriptionSync', () => ({ syncPurchasedOrganization: jest.fn() }))
jest.mock('@/constants/revenuecat', () => ({
  REVENUECAT_API_KEY: 'test_mock', REVENUECAT_IS_ENABLED: true,
  REVENUECAT_ENTITLEMENT_ID: 'GreekGeek Pro', REVENUECAT_PRODUCT_IDS: { yearly: 'yearly' },
}))
jest.mock('react-native-purchases', () => ({
  isConfigured: jest.fn(), configure: jest.fn(), setLogLevel: jest.fn(),
  getCustomerInfo: jest.fn(), getOfferings: jest.fn(), logIn: jest.fn(), getAppUserID: jest.fn(),
  purchasePackage: jest.fn(), restorePurchases: jest.fn(),
  addCustomerInfoUpdateListener: jest.fn(), removeCustomerInfoUpdateListener: jest.fn(),
  setEmail: jest.fn(), setDisplayName: jest.fn(), setPhoneNumber: jest.fn(), setAttributes: jest.fn(),
  checkTrialOrIntroductoryPriceEligibility: jest.fn(),
  LOG_LEVEL: { DEBUG: 'DEBUG' }, PACKAGE_TYPE: { ANNUAL: 'ANNUAL' },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: 'CANCELLED' },
}))
const sdk = Purchases as jest.Mocked<typeof Purchases>
const user = { is_staff: true, org: { id: 1, revenuecat_app_user_id: 'organization-uuid' } }
const empty = { entitlements: { active: {} }, activeSubscriptions: [] } as any
const paid = { entitlements: { active: {} }, activeSubscriptions: ['yearly'] } as any
let billing: ReturnType<typeof useRevenueCat>
let tree: ReturnType<typeof create>
function Consumer() { billing = useRevenueCat(); return null }

beforeEach(async () => {
  ;(globalThis as any).__DEV__ = true
  ;(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true
  jest.resetAllMocks()
  sdk.isConfigured.mockResolvedValue(false)
  sdk.getCustomerInfo.mockResolvedValue(empty)
  sdk.checkTrialOrIntroductoryPriceEligibility.mockResolvedValue({})
  sdk.getAppUserID.mockResolvedValue('organization-uuid')
  sdk.logIn.mockResolvedValue({ customerInfo: empty } as any)
  sdk.getOfferings.mockResolvedValue({ current: { annual: { product: { identifier: 'yearly' } } } } as any)
  for (const fn of [sdk.setEmail, sdk.setDisplayName, sdk.setPhoneNumber, sdk.setAttributes]) fn.mockResolvedValue(undefined)
  sdk.purchasePackage.mockResolvedValue({ customerInfo: paid } as any)
  sdk.restorePurchases.mockResolvedValue(paid)
  await act(async () => { tree = create(<RevenueCatProvider><Consumer /></RevenueCatProvider>) })
})
afterEach(async () => { await act(async () => tree.unmount()) })

test('purchase identifies organization before charging and verifies server access before completion', async () => {
  await act(async () => { await expect(billing.purchaseProPackage(user)).resolves.toBe(paid) })
  expect(sdk.logIn).toHaveBeenCalledWith('organization-uuid')
  expect(sdk.logIn.mock.invocationCallOrder[0]).toBeLessThan(sdk.purchasePackage.mock.invocationCallOrder[0])
  expect(syncPurchasedOrganization).toHaveBeenCalledTimes(1)
  expect(billing.isGreekGeekPro).toBe(true)
  expect(billing.activeOrganizationId).toBe('organization-uuid')
})

test('restore verifies server access without purchasing again', async () => {
  await act(async () => { await expect(billing.restorePurchases(user)).resolves.toBe(paid) })
  expect(syncPurchasedOrganization).toHaveBeenCalledTimes(1)
  expect(sdk.purchasePackage).not.toHaveBeenCalled()
})

test('identity mismatch prevents a purchase', async () => {
  sdk.getAppUserID.mockResolvedValue('another-org')
  await act(async () => { await expect(billing.purchaseProPackage(user)).rejects.toThrow('identity') })
  expect(sdk.purchasePackage).not.toHaveBeenCalled()
})

test('cancelled purchase does not verify or unlock access', async () => {
  sdk.purchasePackage.mockRejectedValue({ userCancelled: true })
  await act(async () => { await expect(billing.purchaseProPackage(user)).resolves.toBeNull() })
  expect(syncPurchasedOrganization).not.toHaveBeenCalled()
  expect(billing.isGreekGeekPro).toBe(false)
})


test('completed purchase remains distinguishable from store failure when backend verification fails', async () => {
  ;(syncPurchasedOrganization as jest.Mock).mockRejectedValue(new Error('verification pending'))
  await act(async () => { await expect(billing.purchaseProPackage(user)).rejects.toThrow('verification pending') })
  expect(sdk.purchasePackage).toHaveBeenCalledTimes(1)
  expect(billing.customerInfo).toBe(paid)
})

test('Customer Center restore also updates organization access', async () => {
  sdk.getCustomerInfo.mockResolvedValue(paid)
  await act(async () => { await billing.openCustomerCenter(user) })
  expect(syncPurchasedOrganization).toHaveBeenCalledTimes(1)
  expect(sdk.purchasePackage).not.toHaveBeenCalled()
})
