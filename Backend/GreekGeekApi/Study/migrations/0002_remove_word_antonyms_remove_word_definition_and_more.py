# Generated by Django 5.1.2 on 2024-10-15 01:13

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('Study', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='word',
            name='antonyms',
        ),
        migrations.RemoveField(
            model_name='word',
            name='definition',
        ),
        migrations.RemoveField(
            model_name='word',
            name='example',
        ),
        migrations.RemoveField(
            model_name='word',
            name='part_of_speech',
        ),
        migrations.RemoveField(
            model_name='word',
            name='pronunciation',
        ),
        migrations.RemoveField(
            model_name='word',
            name='synonyms',
        ),
    ]
