from django.db import migrations, models
import uuid


def populate_revenuecat_app_user_ids(apps, schema_editor):
    Org = apps.get_model('Study', 'Org')
    for org in Org.objects.filter(revenuecat_app_user_id__isnull=True):
        org.revenuecat_app_user_id = uuid.uuid4()
        org.save(update_fields=['revenuecat_app_user_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('Study', '0029_org_timezone_default_eastern'),
    ]

    operations = [
        migrations.AddField(
            model_name='org',
            name='revenuecat_app_user_id',
            field=models.UUIDField(blank=True, null=True, editable=False),
        ),
        migrations.AddField(
            model_name='org',
            name='revenuecat_entitlement_expires_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='org',
            name='revenuecat_original_transaction_id',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='org',
            name='revenuecat_product_id',
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name='org',
            name='revenuecat_store',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name='org',
            name='revenuecat_subscription_status',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.RunPython(populate_revenuecat_app_user_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='org',
            name='revenuecat_app_user_id',
            field=models.UUIDField(default=uuid.uuid4, unique=True, editable=False),
        ),
    ]
