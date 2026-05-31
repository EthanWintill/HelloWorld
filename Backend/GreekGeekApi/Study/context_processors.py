from django.conf import settings


def public_site_settings(request):
    return {
        'APP_STORE_URL': settings.APP_STORE_URL,
        'STATIC_ASSET_VERSION': settings.STATIC_ASSET_VERSION,
    }
