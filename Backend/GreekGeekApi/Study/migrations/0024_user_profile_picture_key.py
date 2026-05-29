from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('Study', '0023_orgsettings'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='profile_picture_key',
            field=models.CharField(blank=True, max_length=512, null=True),
        ),
    ]
