from django.contrib.auth.models import User
from django.db import models


class Experiencia(models.Model):
    CATEGORIAS = [
        ('CAMINATA', 'Caminata'),
        ('TALLER', 'Taller'),
        ('GASTRONOMIA', 'Gastronomía'),
        ('AVENTURA', 'Aventura'),
        ('CULTURAL', 'Cultural'),
    ]
    nombre = models.CharField(max_length=120, unique=True)
    descripcion = models.TextField(blank=True)
    categoria = models.CharField(max_length=20, choices=CATEGORIAS)
    precio_persona = models.DecimalField(max_digits=10, decimal_places=2)
    capacidad_maxima = models.PositiveIntegerField()
    duracion_horas = models.PositiveSmallIntegerField(default=2)
    guia = models.ForeignKey(User, on_delete=models.PROTECT, related_name='experiencias')
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre


class Salida(models.Model):
    """Fecha y hora concreta en que se realiza una experiencia (1:N con Experiencia)."""
    experiencia = models.ForeignKey(Experiencia, on_delete=models.CASCADE, related_name='salidas')
    fecha_hora = models.DateTimeField()
    activo = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['experiencia', 'fecha_hora'], name='salida_unica_experiencia_fecha'),
        ]

    def __str__(self):
        return f'{self.experiencia} - {self.fecha_hora:%Y-%m-%d %H:%M}'
