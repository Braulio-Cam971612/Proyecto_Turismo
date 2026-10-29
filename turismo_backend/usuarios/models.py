from django.contrib.auth.models import User
from django.db import models


class Perfil(models.Model):
    ROLES = [
        ('ADMIN', 'Administrador de la Asociación'),
        ('GUIA', 'Guía Local'),
        ('ANFITRION', 'Anfitrión de Hospedaje'),
        ('TURISTA', 'Turista'),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    rol = models.CharField(max_length=20, choices=ROLES, default='TURISTA')
    telefono = models.CharField(max_length=20, blank=True)
    pais = models.CharField(max_length=60, blank=True)

    def __str__(self):
        return f'{self.user.username} ({self.rol})'
