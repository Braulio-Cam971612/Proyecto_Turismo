from django.core.validators import MinValueValidator
from django.db import models

from experiencias.models import Experiencia
from reservas.models import Reserva


class Resena(models.Model):
    """Calificacion del turista sobre una reserva completada (1:1 con Reserva)."""
    reserva = models.OneToOneField(Reserva, on_delete=models.CASCADE, related_name='resena')
    calificacion = models.PositiveSmallIntegerField()
    comentario = models.CharField(max_length=500, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=models.Q(calificacion__gte=1) & models.Q(calificacion__lte=5), name='resena_calificacion_1_a_5'),
        ]


class MetricaSostenibilidad(models.Model):
    """Metrica de impacto ambiental asociada a una experiencia."""
    TIPOS = [('CO2_EVITADO_KG', 'CO2 evitado (kg)'), ('RESIDUOS_KG', 'Residuos reciclados (kg)'),
             ('AGUA_AHORRADA_L', 'Agua ahorrada (litros)'), ('ARBOLES', 'Árboles plantados')]
    experiencia = models.ForeignKey(Experiencia, on_delete=models.CASCADE, related_name='metricas')
    tipo = models.CharField(max_length=20, choices=TIPOS)
    valor = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    fecha = models.DateField()
    notas = models.CharField(max_length=200, blank=True)


class DistribucionIngreso(models.Model):
    """Se genera automaticamente al pagar una reserva: parte para la comunidad y parte para la asociacion."""
    reserva = models.OneToOneField(Reserva, on_delete=models.CASCADE, related_name='distribucion')
    monto_total = models.DecimalField(max_digits=12, decimal_places=2)
    porcentaje_comunidad = models.DecimalField(max_digits=5, decimal_places=2)
    monto_comunidad = models.DecimalField(max_digits=12, decimal_places=2)
    monto_asociacion = models.DecimalField(max_digits=12, decimal_places=2)
    fecha = models.DateTimeField(auto_now_add=True)

# Create your models here.
