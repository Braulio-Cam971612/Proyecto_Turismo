import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('experiencias', '0001_initial'),
        ('hospedajes', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Reserva',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('personas', models.PositiveIntegerField(default=0)),
                ('fecha_entrada', models.DateField(blank=True, null=True)),
                ('fecha_salida', models.DateField(blank=True, null=True)),
                ('huespedes', models.PositiveIntegerField(default=0)),
                ('estado', models.CharField(choices=[('PENDIENTE', 'Pendiente'), ('CONFIRMADA', 'Confirmada'), ('CANCELADA', 'Cancelada'), ('COMPLETADA', 'Completada')], default='PENDIENTE', max_length=20)),
                ('estado_pago', models.CharField(choices=[('PENDIENTE', 'Pendiente'), ('PAGADO', 'Pagado'), ('REEMBOLSADO', 'Reembolsado')], default='PENDIENTE', max_length=20)),
                ('total', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('notas', models.CharField(blank=True, max_length=300)),
                ('fecha_creacion', models.DateTimeField(auto_now_add=True)),
                ('hospedaje', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='reservas', to='hospedajes.hospedaje')),
                ('salida', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='reservas', to='experiencias.salida')),
                ('turista', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='reservas', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'constraints': [models.CheckConstraint(condition=models.Q(('salida__isnull', False), ('hospedaje__isnull', False), _connector='OR'), name='reserva_con_tour_o_hospedaje')],
            },
        ),
    ]
