# Generated by Django 5.1.2 on 2024-11-23 19:40

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("Study", "0008_alter_user_group_id_alter_user_last_location_and_more"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="org",
            options={"ordering": ["id"]},
        ),
    ]
