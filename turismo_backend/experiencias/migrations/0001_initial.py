import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Experiencia',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=120, unique=True)),
                ('descripcion', models.TextField(blank=True)),
                ('categoria', models.CharField(choices=[('CAMINATA', 'Caminata'), ('TALLER', 'Taller'), ('GASTRONOMIA', 'Gastronomía'), ('AVENTURA', 'Aventura'), ('CULTURAL', 'Cultural')], max_length=20)),
                ('precio_persona', models.DecimalField(decimal_places=2, max_digits=10)),
                ('capacidad_maxima', models.PositiveIntegerField()),
                ('duracion_horas', models.PositiveSmallIntegerField(default=2)),
                ('activo', models.BooleanField(default=True)),
                ('guia', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='experiencias', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Salida',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha_hora', models.DateTimeField()),
                ('activo', models.BooleanField(default=True)),
                ('experiencia', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='salidas', to='experiencias.experiencia')),
            ],
            options={
                'constraints': [models.UniqueConstraint(fields=('experiencia', 'fecha_hora'), name='salida_unica_experiencia_fecha')],
            },
        ),
    ]
