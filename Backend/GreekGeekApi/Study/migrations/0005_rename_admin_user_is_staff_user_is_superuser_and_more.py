# Generated by Django 5.1.2 on 2024-11-20 07:15

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("Study", "0004_group_name"),
    ]

    operations = [
        migrations.RenameField(
            model_name="user",
            old_name="admin",
            new_name="is_staff",
        ),
        migrations.AddField(
            model_name="user",
            name="is_superuser",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="last_login",
            field=models.DateTimeField(
                blank=True, null=True, verbose_name="last login"
            ),
        ),
        migrations.AlterField(
            model_name="user",
            name="live",
            field=models.BooleanField(default=False),
        ),
    ]