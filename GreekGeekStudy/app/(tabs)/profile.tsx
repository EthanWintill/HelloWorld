import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Image, Linking, Text, View, TouchableOpacity, SafeAreaView, ScrollView, Switch, Modal } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from '@/constants';
import { router } from 'expo-router';
import { useDashboard } from '../../context/DashboardContext'
import { useRevenueCat } from '../../context/RevenueCatContext'
import { LoadingScreen } from '../../components/LoadingScreen'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { REVENUECAT_ENTITLEMENT_ID, REVENUECAT_PRODUCT_IDS } from '@/constants/revenuecat';

type BillingApiResponse = {
  organization?: Record<string, any>
  billing?: Record<string, any>
}

type BillingDisplay = {
  canCancelWebBilling: boolean
  hasRevenueCatBilling: boolean
  isPremium: boolean
  plan: string
  renewal: string
  source: string
  statusDetail: string
  statusLabel: string
  statusValue: string
  subscription: string
  syncError: string | null
  trial: string
}

const formatBillingDate = (value?: string | null) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const buildBillingDisplay = (
  billingState: BillingApiResponse | null,
  org: Record<string, any> | null | undefined,
  isGreekGeekPro: boolean
): BillingDisplay => {
  const billing = billingState?.billing ?? {}
  const status = billing.stripe_subscription_status ?? org?.stripe_subscription_status ?? ''
  const revenueCatStatus = billing.revenuecat_subscription_status ?? org?.revenuecat_subscription_status ?? ''
  const revenueCatExpiresAt = billing.revenuecat_entitlement_expires_at ?? org?.revenuecat_entitlement_expires_at ?? null
  const revenueCatExpiresDate = revenueCatExpiresAt ? new Date(revenueCatExpiresAt) : null
  const hasRevenueCatBilling = Boolean(
    isGreekGeekPro
    || (revenueCatStatus === 'active' && (!revenueCatExpiresDate || revenueCatExpiresDate > new Date()))
  )
  const isPremium = Boolean(billing.is_premium ?? org?.is_premium ?? false) || ['active', 'trialing'].includes(status) || hasRevenueCatBilling
  const cancelAtPeriodEnd = Boolean(billing.stripe_cancel_at_period_end ?? org?.stripe_cancel_at_period_end ?? false)
  const currentPeriodEnd = billing.stripe_current_period_end ?? org?.stripe_current_period_end ?? null
  const trialEndsAt = billing.trial_ends_at ?? org?.trial_ends_at ?? null
  const renewalValue = currentPeriodEnd || trialEndsAt || revenueCatExpiresAt
  const renewalDate = formatBillingDate(renewalValue)
  const trialDate = formatBillingDate(trialEndsAt)
  const subscription = billing.stripe_subscription_id
    ?? org?.stripe_subscription_id
    ?? billing.revenuecat_product_id
    ?? org?.revenuecat_product_id
    ?? 'None'

  if (status === 'trialing') {
    return {
      canCancelWebBilling: Boolean((billing.stripe_subscription_id ?? org?.stripe_subscription_id) && !cancelAtPeriodEnd),
      hasRevenueCatBilling,
      isPremium,
      plan: 'GreekGeek Pro · $149.99/year',
      renewal: renewalDate ? (cancelAtPeriodEnd ? `Ends ${renewalDate}` : `Trial ends ${renewalDate}`) : 'Not available',
      source: 'Web billing',
      statusDetail: cancelAtPeriodEnd
        ? `Your trial remains available until ${renewalDate || 'the current period ends'}.`
        : `Your one-month trial is active${renewalDate ? ` until ${renewalDate}` : ''}.`,
      statusLabel: 'Trial',
      statusValue: cancelAtPeriodEnd ? 'Cancel scheduled' : 'Trial active',
      subscription,
      syncError: billing.sync_error ?? null,
      trial: trialDate ? `Ends ${trialDate}` : 'Active',
    }
  }

  if (status === 'active') {
    return {
      canCancelWebBilling: Boolean((billing.stripe_subscription_id ?? org?.stripe_subscription_id) && !cancelAtPeriodEnd),
      hasRevenueCatBilling,
      isPremium,
      plan: 'GreekGeek Pro · $149.99/year',
      renewal: renewalDate ? (cancelAtPeriodEnd ? `Ends ${renewalDate}` : `Renews ${renewalDate}`) : 'Not available',
      source: 'Web billing',
      statusDetail: cancelAtPeriodEnd
        ? `Your subscription will end on ${renewalDate || 'the current period end date'}.`
        : `Your subscription is active${renewalDate ? ` and renews on ${renewalDate}` : ''}.`,
      statusLabel: 'Subscription',
      statusValue: cancelAtPeriodEnd ? 'Cancel scheduled' : 'Currently paying',
      subscription,
      syncError: billing.sync_error ?? null,
      trial: trialDate ? `Ended ${trialDate}` : 'Not in trial',
    }
  }

  if (hasRevenueCatBilling) {
    const expiresDate = formatBillingDate(revenueCatExpiresAt)
    return {
      canCancelWebBilling: false,
      hasRevenueCatBilling,
      isPremium,
      plan: 'GreekGeek Pro · $149.99/year',
      renewal: expiresDate || 'Managed in app',
      source: 'Mobile app',
      statusDetail: expiresDate
        ? `Your App Store subscription is active until ${expiresDate}.`
        : 'Your App Store subscription is active.',
      statusLabel: 'App Store',
      statusValue: 'Active',
      subscription,
      syncError: billing.sync_error ?? null,
      trial: 'Not in trial',
    }
  }

  if (isPremium) {
    return {
      canCancelWebBilling: false,
      hasRevenueCatBilling,
      isPremium,
      plan: 'GreekGeek Pro · $149.99/year',
      renewal: renewalDate || 'Not available',
      source: 'Organization billing',
      statusDetail: 'Your organization has premium access.',
      statusLabel: 'Status',
      statusValue: 'Premium active',
      subscription,
      syncError: billing.sync_error ?? null,
      trial: trialDate ? `Ends ${trialDate}` : 'Not in trial',
    }
  }

  return {
    canCancelWebBilling: false,
    hasRevenueCatBilling,
    isPremium,
    plan: 'GreekGeek Pro · $149.99/year',
    renewal: 'Not available',
    source: 'None',
    statusDetail: 'Start the free trial to unlock premium access for your organization.',
    statusLabel: 'Trial',
    statusValue: 'Not started',
    subscription,
    syncError: billing.sync_error ?? null,
    trial: 'Not started',
  }
}

const Profile = () => {
  const { dashboardState, refreshDashboard } = useDashboard()
  const {
    customerInfo,
    error: revenueCatError,
    isGreekGeekPro,
    isLoading: revenueCatLoading,
    openCustomerCenter,
    proPackage,
    purchaseProPackage,
    refreshOfferings,
    resetUser,
    restorePurchases,
  } = useRevenueCat()
  const { isLoading, error, data } = dashboardState
  const orgIsPremium = Boolean(data?.org?.is_premium)
  const orgRevenueCatExpiresAt = data?.org?.revenuecat_entitlement_expires_at
    ? new Date(data.org.revenuecat_entitlement_expires_at)
    : null
  const orgRevenueCatIsCurrent = data?.org?.revenuecat_subscription_status === 'active'
    && (!orgRevenueCatExpiresAt || orgRevenueCatExpiresAt > new Date())
  const hasRevenueCatBilling = isGreekGeekPro || orgRevenueCatIsCurrent
  const hasOrgPremiumAccess = orgIsPremium || isGreekGeekPro
  const canManageOrgSubscription = Boolean(data?.is_staff && data?.org)
  const canPurchaseOrgSubscription = canManageOrgSubscription && !hasOrgPremiumAccess

  // Notification toggles state
  const [notifyOrgStudying, setNotifyOrgStudying] = useState(data?.notify_org_starts_studying ?? true)
  const [notifyUserLeaves, setNotifyUserLeaves] = useState(data?.notify_user_leaves_zone ?? true)
  const [notifyDeadline, setNotifyDeadline] = useState(data?.notify_study_deadline_approaching ?? true)
  const [saving, setSaving] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [profilePictureUploading, setProfilePictureUploading] = useState(false)
  const [paywallVisible, setPaywallVisible] = useState(false)
  const [billingVisible, setBillingVisible] = useState(false)
  const [billingState, setBillingState] = useState<BillingApiResponse | null>(null)
  const [billingLoading, setBillingLoading] = useState(false)
  const [billingError, setBillingError] = useState<string | null>(null)
  const [subscriptionAction, setSubscriptionAction] = useState<'paywall' | 'restore' | 'customer-center' | 'cancel-web' | null>(null)
  const proEntitlement = customerInfo?.entitlements.active[REVENUECAT_ENTITLEMENT_ID] ?? null
  const proProductIdentifier = proEntitlement?.productIdentifier
    || data?.org?.revenuecat_product_id
    || proPackage?.product.identifier
    || customerInfo?.activeSubscriptions.find((productId) => productId === REVENUECAT_PRODUCT_IDS.yearly)
    || customerInfo?.activeSubscriptions[0]
    || REVENUECAT_PRODUCT_IDS.yearly
  const proPrice = proPackage?.product.priceString
  const proPeriod = proPackage?.product.subscriptionPeriod === 'P1Y' ? 'per year' : 'subscription'
  const proTitle = proPackage?.product.title || 'GreekGeek Pro'
  const proDescription = proPackage?.product.description || 'Organization-wide Pro access for your chapter.'
  const billingDisplay = buildBillingDisplay(billingState, data?.org, isGreekGeekPro)

  useEffect(() => {
    if (!canManageOrgSubscription) return

    refreshOfferings().catch((error) => {
      console.warn('RevenueCat offerings failed:', error)
    })
  }, [canManageOrgSubscription, refreshOfferings])

  const withTimeout = async <T,>(promise: Promise<T>, milliseconds: number, label: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout>
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${milliseconds}ms`)), milliseconds)
    })

    try {
      return await Promise.race([promise, timeoutPromise])
    } finally {
      clearTimeout(timeoutId!)
    }
  }

  const signout = async () => {
    try {
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'dashboardData']);
      await resetUser().catch((error) => {
        console.warn('RevenueCat logout failed:', error);
      });
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  };

  const navigateToAdmin = () => {
    if (canPurchaseOrgSubscription) {
      handlePresentPaywall()
      return
    }
    router.push('/(admin)');
  };

  const openUrl = async (path: string) => {
    await Linking.openURL(`${API_URL}${path}`)
  }

  const handleChangePassword = async () => {
    await Linking.openURL(`${API_URL}forgot-password/`)
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your GreekGeek account and sign you out. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('accessToken')
              if (!token) throw new Error('No access token found')
              await axios.delete(`${API_URL}api/me/`, {
                headers: { Authorization: `Bearer ${token}` },
              })
              await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'dashboardData'])
              await resetUser().catch((error) => {
                console.warn('RevenueCat logout failed:', error)
              })
              router.replace('/(auth)/sign-in')
            } catch (error) {
              Alert.alert("Error", "Unable to delete your account. Please try again or contact support.")
            }
          }
        }
      ]
    )
  }

  const handleProfilePicturePress = async () => {
    try {
      console.log('[ProfilePicture] Starting profile picture update')
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
      console.log('[ProfilePicture] Photo library permission:', permission.status)
      if (!permission.granted) {
        Alert.alert("Permission Required", "Photo library access is needed to choose a profile picture.")
        return
      }

      console.log('[ProfilePicture] Launching image library')
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      })

      if (result.canceled || !result.assets?.length) {
        console.log('[ProfilePicture] Image selection cancelled')
        return
      }

      const asset = result.assets[0]
      const contentType = asset.mimeType || 'image/jpeg'
      console.log('[ProfilePicture] Selected asset:', {
        uri: asset.uri,
        contentType,
        fileSize: asset.fileSize,
        width: asset.width,
        height: asset.height,
      })
      const longestSide = Math.max(asset.width || 0, asset.height || 0)
      const resizeAction = longestSide > 512
        ? asset.width >= asset.height
          ? { resize: { width: 512 } }
          : { resize: { height: 512 } }
        : { resize: { width: asset.width || 512 } }
      console.log('[ProfilePicture] Compressing avatar before upload')
      const compressedAsset = await withTimeout(
        ImageManipulator.manipulateAsync(
          asset.uri,
          [resizeAction],
          {
            compress: 0.72,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        ),
        15000,
        'Profile picture compression'
      )
      const compressedInfo = await FileSystem.getInfoAsync(compressedAsset.uri)
      const uploadContentType = 'image/jpeg'
      console.log('[ProfilePicture] Compressed asset:', {
        uri: compressedAsset.uri,
        width: compressedAsset.width,
        height: compressedAsset.height,
        originalSize: asset.fileSize,
        compressedSize: compressedInfo.exists ? compressedInfo.size : undefined,
      })
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) throw new Error('No access token found')

      setProfilePictureUploading(true)
      console.log('[ProfilePicture] Requesting presigned upload URL')
      const presignResponse = await withTimeout(
        axios.post(
          `${API_URL}api/profile-picture/`,
          {
            action: 'presign',
            content_type: uploadContentType,
            file_size: compressedInfo.exists ? compressedInfo.size : undefined,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000,
          }
        ),
        15000,
        'Profile picture presign'
      )
      console.log('[ProfilePicture] Presign complete:', {
        objectKey: presignResponse.data.object_key,
        contentType: presignResponse.data.content_type,
        expiresIn: presignResponse.data.expires_in,
      })

      console.log('[ProfilePicture] Uploading file directly to S3')
      const uploadResponse = await withTimeout(
        FileSystem.uploadAsync(presignResponse.data.upload_url, compressedAsset.uri, {
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
          headers: {
            'Content-Type': presignResponse.data.content_type,
          },
        }),
        30000,
        'Profile picture S3 upload'
      )
      console.log('[ProfilePicture] S3 upload response:', uploadResponse.status)

      if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
        console.log('[ProfilePicture] S3 upload body:', uploadResponse.body)
        throw new Error(`S3 upload failed with status ${uploadResponse.status}`)
      }

      console.log('[ProfilePicture] Completing upload with backend')
      await withTimeout(
        axios.post(
          `${API_URL}api/profile-picture/`,
          {
            action: 'complete',
            object_key: presignResponse.data.object_key,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 15000,
          }
        ),
        15000,
        'Profile picture complete'
      )

      console.log('[ProfilePicture] Refreshing dashboard after upload')
      await refreshDashboard()
      console.log('[ProfilePicture] Profile picture update complete')
    } catch (error) {
      console.error('Profile picture upload failed:', error)
      Alert.alert("Error", "Unable to update your profile picture. Please try again.")
    } finally {
      setProfilePictureUploading(false)
    }
  }

  // Save notification settings
  const handleSaveNotifications = async () => {
    setSaving(true)
    try {
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) throw new Error('No access token found')
      await axios.put(
        `${API_URL}api/user/${data.id}/`,
        {
          notify_org_starts_studying: notifyOrgStudying,
          notify_user_leaves_zone: notifyUserLeaves,
          notify_study_deadline_approaching: notifyDeadline,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      if (refreshDashboard) await refreshDashboard()
      setModalVisible(false)
    } catch (error) {
      // Optionally show a toast or error UI
    } finally {
      setSaving(false)
    }
  }

  const getBillingErrorMessage = (billingRequestError: unknown, fallback: string) => {
    if (axios.isAxiosError(billingRequestError)) {
      const detail = billingRequestError.response?.data?.detail
      if (typeof detail === 'string') return detail
    }
    if (billingRequestError instanceof Error) return billingRequestError.message
    return fallback
  }

  const fetchOrgBilling = async () => {
    if (!canManageOrgSubscription) {
      throw new Error('Only organization admins can manage billing.')
    }

    setBillingLoading(true)
    setBillingError(null)
    try {
      const token = await AsyncStorage.getItem('accessToken')
      if (!token) throw new Error('No access token found')

      const response = await axios.post<BillingApiResponse>(
        `${API_URL}api/billing/sync-subscription/`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      setBillingState(response.data)
      return response.data
    } catch (billingRequestError) {
      const message = getBillingErrorMessage(billingRequestError, 'Unable to refresh billing details.')
      setBillingError(message)
      throw billingRequestError
    } finally {
      setBillingLoading(false)
    }
  }

  const handleOpenBilling = async () => {
    if (!canManageOrgSubscription) {
      Alert.alert('Admin only', 'Only organization admins can manage billing.')
      return
    }
    if (!hasOrgPremiumAccess) {
      await handlePresentPaywall()
      return
    }

    setBillingVisible(true)
    await fetchOrgBilling().catch((billingRequestError) => {
      console.warn('Billing refresh failed:', billingRequestError)
    })
  }

  const handleCancelWebBilling = () => {
    if (!billingDisplay.canCancelWebBilling) return

    Alert.alert(
      'Cancel subscription?',
      'Premium access remains active through the current billing period.',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            setSubscriptionAction('cancel-web')
            setBillingError(null)
            try {
              const token = await AsyncStorage.getItem('accessToken')
              if (!token) throw new Error('No access token found')
              const response = await axios.post<BillingApiResponse>(
                `${API_URL}api/billing/cancel-subscription/`,
                {},
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              )
              setBillingState(response.data)
              await refreshDashboard().catch((error) => {
                console.warn('Dashboard refresh after billing cancellation failed:', error)
              })
              Alert.alert('Cancellation scheduled', 'Premium access remains active through the current period.')
            } catch (billingRequestError) {
              const message = getBillingErrorMessage(billingRequestError, 'Unable to cancel subscription.')
              setBillingError(message)
              Alert.alert('Unable to cancel', message)
            } finally {
              setSubscriptionAction(null)
            }
          },
        },
      ]
    )
  }

  const syncWebBillingBeforePaywall = async () => {
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
        console.warn('Dashboard refresh after web billing sync failed:', error)
      })
      Alert.alert('GreekGeek Pro', 'Your organization already has Pro access.')
      return true
    }

    return false
  }

  const handlePresentPaywall = async () => {
    setSubscriptionAction('paywall')
    try {
      const alreadyPremium = await syncWebBillingBeforePaywall()
      if (alreadyPremium) return

      setPaywallVisible(true)
      await refreshOfferings().catch((error) => {
        console.warn('RevenueCat offerings failed:', error)
      })
    } catch (error) {
      console.warn('Web billing sync before paywall failed:', error)
      Alert.alert('Subscription unavailable', 'Could not verify organization billing. Please try again.')
    } finally {
      setSubscriptionAction(null)
    }
  }

  const handlePurchasePro = async () => {
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
  }

  const handleRestorePurchases = async () => {
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
  }

  const handleOpenCustomerCenter = async () => {
    setSubscriptionAction('customer-center')
    try {
      await withTimeout(openCustomerCenter(), 15000, 'Customer Center')
    } catch (error) {
      Alert.alert(
        'Subscription management unavailable',
        'Could not open Customer Center. This can happen in Simulator or Test Store builds. Test App Store subscription management on a sandbox device or TestFlight build.'
      )
    } finally {
      setSubscriptionAction(null)
    }
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (error) {
    return (
      <ScrollView className="flex-1 p-4">
        <Text className="text-gg-error text-lg font-bold">Error:</Text>
        <Text className="text-gg-error">{JSON.stringify(error, null, 2)}</Text>
      </ScrollView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-gg-bg">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
        <View className="px-4 pt-4">
          <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl p-4 shadow-sm">
            <View className="items-center">
              <View className="relative mb-3">
                <View className="h-28 w-28 rounded-full bg-gg-surfaceLow border border-gg-outlineVariant items-center justify-center overflow-hidden">
                  {data.profile_picture_url ? (
                    <Image
                      source={{ uri: data.profile_picture_url }}
                      className="h-28 w-28 rounded-full"
                    />
                  ) : (
                    <Ionicons name="person" size={52} color="#006b2c" />
                  )}
                </View>
                {data.live && (
                  <View className="absolute right-2 top-2 bg-gg-error w-4 h-4 rounded-full border-2 border-white" />
                )}
                <TouchableOpacity
                  onPress={handleProfilePicturePress}
                  disabled={profilePictureUploading}
                  className="absolute -right-2 bottom-1 h-10 w-10 rounded-full bg-gg-primary border-2 border-white items-center justify-center shadow-sm"
                  accessibilityLabel="Change profile picture"
                >
                  {profilePictureUploading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="camera" size={18} color="white" />
                  )}
                </TouchableOpacity>
              </View>
              <Text className="font-psemibold text-gg-text text-2xl text-center">
                {data.first_name} {data.last_name}
              </Text>
              <Text className="font-pregular text-gg-muted mt-1 text-center">
                {data.email}
              </Text>
              {data.is_staff && (
                <View className="bg-gg-surfaceLow border border-gg-outlineVariant rounded-full px-3 py-1 mt-3">
                  <Text className="font-psemibold text-gg-primary text-xs">Admin</Text>
                </View>
              )}
            </View>

            <View className="h-px bg-gg-surfaceHighest my-4" />

            <View className="flex-row">
              <View className="flex-1">
                <Text className="font-pregular text-gg-muted text-xs">Organization</Text>
                <Text className="font-psemibold text-gg-text mt-1">{data.org?.name || 'None'}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-pregular text-gg-muted text-xs">Group</Text>
                <Text className="font-psemibold text-gg-text mt-1">{data.group?.name || 'No group'}</Text>
              </View>
              <View className="flex-1 items-end">
                <Text className="font-pregular text-gg-muted text-xs">Status</Text>
                <Text className={`font-psemibold mt-1 ${data.live ? 'text-gg-error' : 'text-gg-text'}`}>
                  {data.live ? 'Studying' : 'Available'}
                </Text>
              </View>
            </View>
          </View>

          {data.is_staff && (
            <TouchableOpacity
              onPress={navigateToAdmin}
              className="bg-gg-primary rounded-xl p-4 mt-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <View className="h-10 w-10 rounded-full bg-gg-surface/10 items-center justify-center mr-3">
                  <Ionicons name="settings-outline" size={20} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-psemibold text-base">Admin dashboard</Text>
                  <Text className="text-white/70 font-pregular text-sm">Manage people, locations, and reports</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>
          )}

          <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl mt-4 shadow-sm overflow-hidden">
            <View className="px-4 py-3 border-b border-gg-outlineVariant flex-row items-center justify-between">
              <Text className="font-psemibold text-gg-text text-lg">Subscription</Text>
              <View className={`rounded-full px-3 py-1 ${hasOrgPremiumAccess ? 'bg-gg-surfaceLow border border-gg-outlineVariant' : 'bg-[#dbe1ff] border border-[#b4c5ff]'}`}>
                <Text className={`font-psemibold text-xs ${hasOrgPremiumAccess ? 'text-gg-primary' : 'text-gg-secondary'}`}>
                  {hasOrgPremiumAccess ? 'Active' : 'Free'}
                </Text>
              </View>
            </View>

            <View className="px-4 py-4 border-b border-gg-outlineVariant">
              <View className="flex-row items-center">
                <Ionicons name="sparkles-outline" size={21} color="#006b2c" />
                <View className="ml-3 flex-1">
                  <Text className="font-psemibold text-gg-text">GreekGeek Pro</Text>
                  <Text className="font-pregular text-gg-muted text-sm mt-1">
                    {canManageOrgSubscription
                      ? billingDisplay.statusDetail
                      : hasOrgPremiumAccess
                      ? 'Your organization has Pro access.'
                      : 'Ask an organization admin to start Pro for your chapter'}
                  </Text>
                </View>
              </View>
              {canManageOrgSubscription && revenueCatError && (
                <View className="bg-[#ffdad6] border border-[#ffb4ab] rounded-lg p-3 mt-3 flex-row">
                  <Ionicons name="alert-circle" size={18} color="#ba1a1a" />
                  <Text className="text-gg-error ml-2 flex-1 font-pregular text-sm">
                    {revenueCatError}
                  </Text>
                </View>
              )}
            </View>

            {canPurchaseOrgSubscription ? (
              <TouchableOpacity
                className={`mx-4 my-4 rounded-xl bg-gg-primary px-4 py-4 flex-row items-center shadow-sm ${(revenueCatLoading || subscriptionAction === 'paywall') ? 'opacity-60' : ''}`}
                onPress={handlePresentPaywall}
                disabled={revenueCatLoading || subscriptionAction === 'paywall'}
              >
                {subscriptionAction === 'paywall' ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="card-outline" size={21} color="white" />
                )}
                <Text className="text-white ml-3 font-psemibold flex-1">Start Free Trial</Text>
                <Ionicons name="chevron-forward" size={18} color="white" />
              </TouchableOpacity>
            ) : canManageOrgSubscription ? (
              <TouchableOpacity
                className={`px-4 py-4 flex-row items-center ${billingLoading ? 'opacity-60' : ''}`}
                onPress={handleOpenBilling}
                disabled={billingLoading}
              >
                {billingLoading ? (
                  <ActivityIndicator size="small" color="#006b2c" />
                ) : (
                  <Ionicons name="card-outline" size={21} color="#3e4a3d" />
                )}
                <Text className="text-gg-text ml-3 font-pmedium flex-1">Manage billing</Text>
                <Ionicons name="chevron-forward" size={18} color="#6e7b6c" />
              </TouchableOpacity>
            ) : (
              <View className="px-4 py-4 flex-row items-center">
                <Ionicons name="information-circle-outline" size={21} color="#3e4a3d" />
                <Text className="text-gg-muted ml-3 font-pregular flex-1">Only organization admins can manage billing.</Text>
              </View>
            )}
          </View>

          <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl mt-4 shadow-sm overflow-hidden">
            <View className="px-4 py-3 border-b border-gg-outlineVariant">
              <Text className="font-psemibold text-gg-text text-lg">Account</Text>
            </View>

            <View className="px-4 py-4 border-b border-gg-outlineVariant flex-row items-center">
              <Ionicons name="mail-outline" size={21} color="#3e4a3d" />
              <View className="ml-3 flex-1">
                <Text className="font-pregular text-gg-muted text-xs">Email address</Text>
                <Text className="font-pmedium text-gg-text mt-1">{data.email}</Text>
              </View>
            </View>

            <View className="px-4 py-4 border-b border-gg-outlineVariant flex-row items-center">
              <Ionicons name="call-outline" size={21} color="#3e4a3d" />
              <View className="ml-3 flex-1">
                <Text className="font-pregular text-gg-muted text-xs">Phone number</Text>
                <Text className="font-pmedium text-gg-text mt-1">{data.phone_number || 'Not added'}</Text>
              </View>
            </View>

            <TouchableOpacity className="px-4 py-4 border-b border-gg-outlineVariant flex-row items-center"
              onPress={() => setModalVisible(true)}
            >
              <Ionicons name="notifications-outline" size={21} color="#3e4a3d" />
              <Text className="text-gg-text ml-3 font-pmedium flex-1">Notification settings</Text>
              <Ionicons name="chevron-forward" size={18} color="#6e7b6c" />
            </TouchableOpacity>

            <TouchableOpacity
              className="px-4 py-4 border-b border-gg-outlineVariant flex-row items-center"
              onPress={handleChangePassword}
            >
              <Ionicons name="lock-closed-outline" size={21} color="#3e4a3d" />
              <Text className="text-gg-text ml-3 font-pmedium flex-1">Change password</Text>
              <Ionicons name="chevron-forward" size={18} color="#6e7b6c" />
            </TouchableOpacity>

            <TouchableOpacity
              className="px-4 py-4 flex-row items-center"
              onPress={() => openUrl('contact/?topic=Technical%20support')}
            >
              <Ionicons name="help-circle-outline" size={21} color="#3e4a3d" />
              <Text className="text-gg-text ml-3 font-pmedium flex-1">Help and support</Text>
              <Ionicons name="chevron-forward" size={18} color="#6e7b6c" />
            </TouchableOpacity>
          </View>

          <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl mt-4 shadow-sm overflow-hidden">
            <View className="px-4 py-3 border-b border-gg-outlineVariant">
              <Text className="font-psemibold text-gg-text text-lg">Legal and access</Text>
            </View>
            <TouchableOpacity
              className="px-4 py-4 border-b border-gg-outlineVariant flex-row items-center"
              onPress={() => openUrl('privacy/')}
            >
              <Ionicons name="shield-checkmark-outline" size={21} color="#3e4a3d" />
              <Text className="text-gg-text ml-3 font-pmedium flex-1">Privacy policy</Text>
              <Ionicons name="chevron-forward" size={18} color="#6e7b6c" />
            </TouchableOpacity>
            <TouchableOpacity
              className="px-4 py-4 border-b border-gg-outlineVariant flex-row items-center"
              onPress={() => openUrl('terms/')}
            >
              <Ionicons name="document-text-outline" size={21} color="#3e4a3d" />
              <Text className="text-gg-text ml-3 font-pmedium flex-1">Terms of service</Text>
              <Ionicons name="chevron-forward" size={18} color="#6e7b6c" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={signout}
              className="px-4 py-4 border-b border-gg-outlineVariant flex-row items-center"
            >
              <Ionicons name="log-out-outline" size={21} color="#3e4a3d" />
              <Text className="text-gg-text ml-3 font-pmedium flex-1">Sign out</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="px-4 py-4 flex-row items-center"
              onPress={handleDeleteAccount}
            >
              <Ionicons name="trash-outline" size={21} color="#ba1a1a" />
              <Text className="text-gg-error ml-3 font-pmedium flex-1">Delete account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={paywallVisible}
          animationType="slide"
          onRequestClose={() => setPaywallVisible(false)}
        >
          <SafeAreaView className="flex-1 bg-gg-bg">
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
              <View className="flex-row justify-end">
                <TouchableOpacity
                  onPress={() => setPaywallVisible(false)}
                  className="h-10 w-10 rounded-full bg-gg-surface border border-gg-outlineVariant items-center justify-center"
                  accessibilityLabel="Close paywall"
                >
                  <Ionicons name="close" size={20} color="#3e4a3d" />
                </TouchableOpacity>
              </View>

              <View className="items-center mt-4 mb-6">
                <View className="h-16 w-16 rounded-full bg-gg-primary items-center justify-center mb-4">
                  <Ionicons name="sparkles" size={30} color="white" />
                </View>
                <Text className="text-gg-text font-pbold text-3xl text-center">GreekGeek Pro</Text>
                <Text className="text-gg-muted font-pregular text-base text-center mt-3">
                  Upgrade {data?.org?.name || 'your organization'} for every member in the chapter.
                </Text>
              </View>

              <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl p-4 mb-4">
                <View className="flex-row mb-4">
                  <Ionicons name="people-outline" size={22} color="#006b2c" />
                  <View className="ml-3 flex-1">
                    <Text className="text-gg-text font-psemibold">Organization-wide access</Text>
                    <Text className="text-gg-muted font-pregular text-sm mt-1">One subscription covers everyone in your org.</Text>
                  </View>
                </View>
                <View className="flex-row mb-4">
                  <Ionicons name="location-outline" size={22} color="#006b2c" />
                  <View className="ml-3 flex-1">
                    <Text className="text-gg-text font-psemibold">Verified study tracking</Text>
                    <Text className="text-gg-muted font-pregular text-sm mt-1">Run study hours with location-based check-ins and admin controls.</Text>
                  </View>
                </View>
                <View className="flex-row">
                  <Ionicons name="bar-chart-outline" size={22} color="#006b2c" />
                  <View className="ml-3 flex-1">
                    <Text className="text-gg-text font-psemibold">Chapter reporting</Text>
                    <Text className="text-gg-muted font-pregular text-sm mt-1">Keep officers aligned on member progress and requirements.</Text>
                  </View>
                </View>
              </View>

              <View className="bg-gg-surface border-2 border-gg-primary rounded-xl p-4 mb-4">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-gg-text font-psemibold text-lg">{proTitle}</Text>
                    <Text className="text-gg-muted font-pregular text-sm mt-1">{proDescription}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-gg-primary font-pbold text-xl">{proPrice || 'Yearly'}</Text>
                    <Text className="text-gg-muted font-pregular text-xs mt-1">{proPrice ? proPeriod : proProductIdentifier}</Text>
                  </View>
                </View>
              </View>

              {revenueCatError && (
                <View className="bg-[#ffdad6] border border-[#ffb4ab] rounded-lg p-3 mb-4 flex-row">
                  <Ionicons name="alert-circle" size={18} color="#ba1a1a" />
                  <Text className="text-gg-error ml-2 flex-1 font-pregular text-sm">{revenueCatError}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={handlePurchasePro}
                disabled={!proPackage || revenueCatLoading || Boolean(subscriptionAction)}
                className={`bg-gg-primary rounded-xl py-4 items-center ${(!proPackage || revenueCatLoading || Boolean(subscriptionAction)) ? 'opacity-60' : ''}`}
              >
                {subscriptionAction === 'paywall' ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-pbold text-base">
                    Start Free Trial
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRestorePurchases}
                disabled={revenueCatLoading || Boolean(subscriptionAction)}
                className={`py-4 items-center ${(revenueCatLoading || Boolean(subscriptionAction)) ? 'opacity-60' : ''}`}
              >
                <Text className="text-gg-primary font-psemibold">Restore purchases</Text>
              </TouchableOpacity>

              <View className="flex-row justify-center flex-wrap mt-2">
                <TouchableOpacity onPress={() => openUrl('terms/')} className="px-2 py-1">
                  <Text className="text-gg-muted font-pregular text-xs">Terms</Text>
                </TouchableOpacity>
                <Text className="text-gg-muted font-pregular text-xs py-1">|</Text>
                <TouchableOpacity onPress={() => openUrl('privacy/')} className="px-2 py-1">
                  <Text className="text-gg-muted font-pregular text-xs">Privacy</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <Modal
          visible={billingVisible && canManageOrgSubscription && hasOrgPremiumAccess}
          animationType="slide"
          onRequestClose={() => setBillingVisible(false)}
        >
          <SafeAreaView className="flex-1 bg-gg-bg">
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 32 }}>
              <View className="flex-row items-center justify-between mb-5">
                <View className="flex-1 pr-3">
                  <Text className="text-gg-text font-pbold text-2xl">Billing</Text>
                  <Text className="text-gg-muted font-pregular text-sm mt-1">
                    {data?.org?.name || 'Your organization'} subscription details.
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setBillingVisible(false)}
                  className="h-10 w-10 rounded-full bg-gg-surface border border-gg-outlineVariant items-center justify-center"
                  accessibilityLabel="Close billing"
                >
                  <Ionicons name="close" size={20} color="#3e4a3d" />
                </TouchableOpacity>
              </View>

              {billingLoading ? (
                <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl p-5 items-center mb-4">
                  <ActivityIndicator size="small" color="#006b2c" />
                  <Text className="text-gg-muted font-pregular text-sm mt-3">Refreshing billing details...</Text>
                </View>
              ) : null}

              {billingError ? (
                <View className="bg-[#ffdad6] border border-[#ffb4ab] rounded-lg p-3 mb-4 flex-row">
                  <Ionicons name="alert-circle" size={18} color="#ba1a1a" />
                  <Text className="text-gg-error ml-2 flex-1 font-pregular text-sm">{billingError}</Text>
                </View>
              ) : null}

              {billingDisplay.syncError ? (
                <View className="bg-[#fff8bd] border border-[#e2c400] rounded-lg p-3 mb-4 flex-row">
                  <Ionicons name="warning-outline" size={18} color="#7a5c00" />
                  <Text className="text-[#5c4300] ml-2 flex-1 font-pregular text-sm">{billingDisplay.syncError}</Text>
                </View>
              ) : null}

              <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl p-4 mb-4 shadow-sm">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-gg-muted font-pregular text-xs uppercase tracking-wider">
                      {billingDisplay.statusLabel}
                    </Text>
                    <Text className="text-gg-text font-pbold text-2xl mt-1">{billingDisplay.statusValue}</Text>
                  </View>
                  <View className={`rounded-full px-3 py-1 ${billingDisplay.isPremium ? 'bg-gg-surfaceLow border border-gg-outlineVariant' : 'bg-[#dbe1ff] border border-[#b4c5ff]'}`}>
                    <Text className={`font-psemibold text-xs ${billingDisplay.isPremium ? 'text-gg-primary' : 'text-gg-secondary'}`}>
                      {billingDisplay.isPremium ? 'Active' : 'Free'}
                    </Text>
                  </View>
                </View>
                <Text className="text-gg-muted font-pregular text-sm mt-3">{billingDisplay.statusDetail}</Text>
              </View>

              <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl overflow-hidden mb-4 shadow-sm">
                {[
                  { label: 'Plan', value: billingDisplay.plan },
                  { label: 'Billing Source', value: billingDisplay.source },
                  { label: 'Trial', value: billingDisplay.trial },
                  { label: 'Renewal / End Date', value: billingDisplay.renewal },
                  { label: 'Subscription', value: billingDisplay.subscription },
                ].map((item, index, items) => (
                  <View
                    key={`billing-detail-${item.label}`}
                    className={`px-4 py-3 ${index < items.length - 1 ? 'border-b border-gg-outlineVariant' : ''}`}
                  >
                    <Text className="text-gg-muted font-pregular text-xs">{item.label}</Text>
                    <Text className="text-gg-text font-psemibold mt-1">{item.value}</Text>
                  </View>
                ))}
              </View>

              <View className="bg-gg-surface border border-gg-outlineVariant rounded-xl overflow-hidden shadow-sm">
                {billingDisplay.hasRevenueCatBilling ? (
                  <TouchableOpacity
                    onPress={handleOpenCustomerCenter}
                    disabled={Boolean(subscriptionAction)}
                    className={`px-4 py-4 border-b border-gg-outlineVariant flex-row items-center ${subscriptionAction ? 'opacity-60' : ''}`}
                  >
                    {subscriptionAction === 'customer-center' ? (
                      <ActivityIndicator size="small" color="#006b2c" />
                    ) : (
                      <Ionicons name="phone-portrait-outline" size={21} color="#3e4a3d" />
                    )}
                    <Text className="text-gg-text ml-3 font-pmedium flex-1">Manage App Store Subscription</Text>
                    <Ionicons name="chevron-forward" size={18} color="#6e7b6c" />
                  </TouchableOpacity>
                ) : null}

                {billingDisplay.canCancelWebBilling ? (
                  <TouchableOpacity
                    onPress={handleCancelWebBilling}
                    disabled={subscriptionAction === 'cancel-web'}
                    className={`px-4 py-4 border-b border-gg-outlineVariant flex-row items-center ${subscriptionAction === 'cancel-web' ? 'opacity-60' : ''}`}
                  >
                    {subscriptionAction === 'cancel-web' ? (
                      <ActivityIndicator size="small" color="#ba1a1a" />
                    ) : (
                      <Ionicons name="close-circle-outline" size={21} color="#ba1a1a" />
                    )}
                    <Text className="text-gg-error ml-3 font-pmedium flex-1">Cancel Subscription</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  onPress={handleRestorePurchases}
                  disabled={Boolean(subscriptionAction)}
                  className={`px-4 py-4 border-b border-gg-outlineVariant flex-row items-center ${subscriptionAction ? 'opacity-60' : ''}`}
                >
                  {subscriptionAction === 'restore' ? (
                    <ActivityIndicator size="small" color="#006b2c" />
                  ) : (
                    <Ionicons name="refresh-outline" size={21} color="#3e4a3d" />
                  )}
                  <Text className="text-gg-text ml-3 font-pmedium flex-1">Restore purchases</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    fetchOrgBilling().catch((billingRequestError) => {
                      console.warn('Billing refresh failed:', billingRequestError)
                    })
                  }}
                  disabled={billingLoading || Boolean(subscriptionAction)}
                  className={`px-4 py-4 flex-row items-center ${(billingLoading || subscriptionAction) ? 'opacity-60' : ''}`}
                >
                  {billingLoading ? (
                    <ActivityIndicator size="small" color="#006b2c" />
                  ) : (
                    <Ionicons name="sync-outline" size={21} color="#3e4a3d" />
                  )}
                  <Text className="text-gg-text ml-3 font-pmedium flex-1">Refresh billing</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View className="flex-1 justify-end">
            <View className="bg-gg-surface p-5 rounded-t-2xl">
              <View className="flex-row items-center justify-between mb-5">
                <Text className="text-xl font-psemibold text-gg-text">Notification settings</Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="h-9 w-9 rounded-full bg-gg-surfaceContainer items-center justify-center"
                >
                  <Ionicons name="close" size={20} color="#3e4a3d" />
                </TouchableOpacity>
              </View>
              <View className="flex-row justify-between items-center py-3 border-b border-gg-outlineVariant">
                <Text className="text-gg-muted flex-1 font-pregular pr-4">Someone starts studying</Text>
                <Switch value={notifyOrgStudying} onValueChange={setNotifyOrgStudying} />
              </View>
              <View className="flex-row justify-between items-center py-3 border-b border-gg-outlineVariant">
                <Text className="text-gg-muted flex-1 font-pregular pr-4">A user leaves the study zone</Text>
                <Switch value={notifyUserLeaves} onValueChange={setNotifyUserLeaves} />
              </View>
              <View className="flex-row justify-between items-center py-3">
                <Text className="text-gg-muted flex-1 font-pregular pr-4">Study deadline is approaching</Text>
                <Switch value={notifyDeadline} onValueChange={setNotifyDeadline} />
              </View>
              <View className="flex-row mt-6">
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  className="flex-1 py-4 rounded-lg bg-gg-surfaceContainer mr-2 items-center"
                >
                  <Text className="text-gg-muted font-psemibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveNotifications}
                  className={`flex-1 py-4 rounded-lg bg-gg-primary ml-2 items-center ${saving ? 'opacity-60' : ''}`}
                  disabled={saving}
                >
                  <Text className="text-white font-psemibold">{saving ? 'Saving...' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  )
}

export default Profile
