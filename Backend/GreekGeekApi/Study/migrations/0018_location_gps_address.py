# Generated by Django 5.1.2 on 2025-06-10 01:13

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("Study", "0017_alter_group_unique_together"),
    ]

    operations = [
        migrations.AddField(
            model_name="location",
            name="gps_address",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
