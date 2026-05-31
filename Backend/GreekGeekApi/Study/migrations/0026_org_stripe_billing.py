from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Study', '0025_email_verification_and_org_trial_state'),
    ]

    operations = [
        migrations.AddField(
            model_name='org',
            name='stripe_customer_id',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='org',
            name='stripe_subscription_id',
            field=models.CharField(blank=True, max_length=255, null=True, unique=True),
        ),
        migrations.AddField(
            model_name='org',
            name='stripe_subscription_status',
            field=models.CharField(blank=True, max_length=64),
        ),
    ]
