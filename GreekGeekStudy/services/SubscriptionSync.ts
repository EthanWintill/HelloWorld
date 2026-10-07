import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { API_URL } from '@/constants'

export class PurchaseSyncError extends Error {
  constructor() {
    super('Your store purchase is saved, but organization access could not be verified yet. Use Restore Purchases to retry; do not purchase again.')
    this.name = 'PurchaseSyncError'
  }
}

export async function syncPurchasedOrganization() {
  const token = await AsyncStorage.getItem('accessToken')
  if (!token) throw new PurchaseSyncError()
  // RevenueCat may need a moment to expose the just-completed transaction.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await axios.post(`${API_URL}api/billing/sync-revenuecat/`, {}, {
        headers: { Authorization: `Bearer ${token}` }, timeout: 15000,
      })
      if (response.data?.billing?.is_premium) return
    } catch {
      // A restore safely retries verification without charging again.
    }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000))
  }
  throw new PurchaseSyncError()
}
