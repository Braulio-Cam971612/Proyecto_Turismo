from django.db import models
from django.contrib.auth.models import User
from django.db.models import Q

from experiencias.models import Salida
from hospedajes.models import Hospedaje

class Reserva(models.Model):
    """Nucleo del sistema. Enlaza un turista con una salida de tour, un hospedaje o ambos.
    Reserva es la tabla intermedia de las relaciones N:M Turista-Salida y Turista-Hospedaje."""
    ESTADOS = [('PENDIENTE', 'Pendiente'), ('CONFIRMADA', 'Confirmada'),
               ('CANCELADA', 'Cancelada'), ('COMPLETADA', 'Completada')]
    PAGOS = [('PENDIENTE', 'Pendiente'), ('PAGADO', 'Pagado'), ('REEMBOLSADO', 'Reembolsado')]

    turista = models.ForeignKey(User, on_delete=models.PROTECT, related_name='reservas')
    salida = models.ForeignKey(Salida, on_delete=models.PROTECT, null=True, blank=True, related_name='reservas')
    personas = models.PositiveIntegerField(default=0)
    hospedaje = models.ForeignKey(Hospedaje, on_delete=models.PROTECT, null=True, blank=True, related_name='reservas')
    fecha_entrada = models.DateField(null=True, blank=True)
    fecha_salida = models.DateField(null=True, blank=True)
    huespedes = models.PositiveIntegerField(default=0)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='PENDIENTE')
    estado_pago = models.CharField(max_length=20, choices=PAGOS, default='PENDIENTE')
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notas = models.CharField(max_length=300, blank=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(salida__isnull=False) | Q(hospedaje__isnull=False),
                name='reserva_con_tour_o_hospedaje'),
        ]

    def __str__(self):
        return f'Reserva {self.pk} - {self.turista}'