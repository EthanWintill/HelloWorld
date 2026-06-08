from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Study', '0030_org_revenuecat_billing'),
    ]

    operations = [
        migrations.AddField(
            model_name='org',
            name='stripe_cancel_at_period_end',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='org',
            name='stripe_current_period_end',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
