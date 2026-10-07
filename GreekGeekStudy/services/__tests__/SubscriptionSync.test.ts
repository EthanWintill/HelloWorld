/// <reference types="jest" />
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { syncPurchasedOrganization, PurchaseSyncError } from '../SubscriptionSync'
import { hasProAccess } from '../ProAccess'

jest.mock('axios', () => ({ post: jest.fn() }))
jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn() }))
jest.mock('@/constants', () => ({ API_URL: 'https://test.invalid/' }))
jest.mock('@/constants/revenuecat', () => ({
  REVENUECAT_ENTITLEMENT_ID: 'GreekGeek Pro', REVENUECAT_PRODUCT_IDS: { yearly: 'yearly' },
}))
const post = axios.post as jest.Mock
const info = (active: string[], entitlements = {}) => ({ activeSubscriptions: active, entitlements: { active: entitlements } } as any)

beforeEach(() => {
  jest.resetAllMocks()
  jest.useFakeTimers()
  ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue('test-token')
})
afterEach(() => jest.useRealTimers())

test('unlocks the configured subscription even if its entitlement mapping is missing', () => {
  expect(hasProAccess(info(['yearly']))).toBe(true)
  expect(hasProAccess(info([], { 'GreekGeek Pro': {} }))).toBe(true)
  expect(hasProAccess(info(['unrelated']))).toBe(false)
  expect(hasProAccess(info([]))).toBe(false)
})

test('waits for backend confirmation when webhook delivery is delayed', async () => {
  post.mockResolvedValueOnce({ data: { billing: { is_premium: false } } })
    .mockResolvedValueOnce({ data: { billing: { is_premium: true } } })
  const result = syncPurchasedOrganization()
  await jest.runAllTimersAsync()
  await expect(result).resolves.toBeUndefined()
  expect(post).toHaveBeenCalledTimes(2)
  expect(post.mock.calls[0][1]).toEqual({}) // Never sends an untrusted premium flag.
})

test('failed verification says the purchase is saved rather than inviting another charge', async () => {
  post.mockRejectedValue(new Error('offline'))
  const result = syncPurchasedOrganization().catch(error => error)
  await jest.runAllTimersAsync()
  const error = await result
  expect(error).toBeInstanceOf(PurchaseSyncError)
  expect(error.message).toContain('do not purchase again')
  expect(post).toHaveBeenCalledTimes(3)
})
