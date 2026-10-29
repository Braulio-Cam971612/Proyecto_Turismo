from django.contrib.auth.models import User
from django.db import models


class Servicio(models.Model):
    """Servicio ofrecido por un hospedaje (wifi, desayuno...). Relacion N:M con Hospedaje."""
    nombre = models.CharField(max_length=60, unique=True)

    def __str__(self):
        return self.nombre


class Hospedaje(models.Model):
    nombre = models.CharField(max_length=120, unique=True)
    descripcion = models.TextField(blank=True)
    ubicacion = models.CharField(max_length=150)
    anfitrion = models.ForeignKey(User, on_delete=models.PROTECT, related_name='hospedajes')
    precio_noche = models.DecimalField(max_digits=10, decimal_places=2)
    capacidad_personas = models.PositiveIntegerField()
    num_habitaciones = models.PositiveSmallIntegerField(default=1)
    servicios = models.ManyToManyField(Servicio, blank=True, related_name='hospedajes')
    activo = models.BooleanField(default=True)

    def __str__(self):
        return self.nombre

# Create your models here. 1234422132
