# Generated by Django 5.1.2 on 2024-11-23 22:39

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("Study", "0009_alter_org_options"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="session",
            options={"ordering": ["id"]},
        ),
    ]
