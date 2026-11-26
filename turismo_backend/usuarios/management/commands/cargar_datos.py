"""Carga datos ficticios de demostracion. Uso: python manage.py cargar_datos"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from experiencias.models import Experiencia, Salida
from hospedajes.models import Hospedaje, Servicio
from resenas.models import MetricaSostenibilidad
from usuarios.models import Perfil

CLAVE = 'Clave12345'  # solo datos ficticios de demostracion


class Command(BaseCommand):
    help = 'Carga usuarios, experiencias, hospedajes y metricas de ejemplo.'

    def handle(self, *args, **options):
        def usuario(username, rol, nombre, staff=False):
            u, creado = User.objects.get_or_create(username=username, defaults={
                'email': f'{username}@ejemplo.com', 'first_name': nombre, 'is_staff': staff})
            if creado:
                u.set_password(CLAVE)
                u.save()
            Perfil.objects.get_or_create(user=u, defaults={'rol': rol, 'pais': 'Costa Rica'})
            return u

        usuario('admin_demo', 'ADMIN', 'Admin Asociación', staff=True)
        guia = usuario('guia_demo', 'GUIA', 'Mariana Guía')
        anfitrion = usuario('anfitrion_demo', 'ANFITRION', 'Doña Rosa')
        usuario('turista_demo', 'TURISTA', 'Turista Demo')

        wifi, _ = Servicio.objects.get_or_create(nombre='Wifi')
        desayuno, _ = Servicio.objects.get_or_create(nombre='Desayuno típico')
        Servicio.objects.get_or_create(nombre='Transporte local')

        exp1, _ = Experiencia.objects.get_or_create(nombre='Caminata nocturna en el manglar', defaults={
            'categoria': 'CAMINATA', 'precio_persona': Decimal('15000'), 'capacidad_maxima': 10,
            'duracion_horas': 3, 'guia': guia, 'descripcion': 'Recorrido guiado con linternas.'})
        exp2, _ = Experiencia.objects.get_or_create(nombre='Taller de chocolate artesanal', defaults={
            'categoria': 'TALLER', 'precio_persona': Decimal('20000'), 'capacidad_maxima': 8,
            'duracion_horas': 2, 'guia': guia, 'descripcion': 'Del cacao a la barra.'})
        base = timezone.now().replace(minute=0, second=0, microsecond=0)
        for exp in (exp1, exp2):
            for dias in (7, 14):
                Salida.objects.get_or_create(experiencia=exp, fecha_hora=base + timedelta(days=dias, hours=3))

        for nombre, ubic, precio, cap in [('Casa Doña Rosa', 'Chacarita, Puntarenas', '25000', 4),
                                          ('Cabaña El Mangle', 'Isla Chira, Puntarenas', '35000', 6)]:
            h, _ = Hospedaje.objects.get_or_create(nombre=nombre, defaults={
                'ubicacion': ubic, 'anfitrion': anfitrion, 'precio_noche': Decimal(precio),
                'capacidad_personas': cap, 'num_habitaciones': 2})
            h.servicios.add(wifi, desayuno)

        MetricaSostenibilidad.objects.get_or_create(
            experiencia=exp1, tipo='RESIDUOS_KG', fecha=timezone.localdate(),
            defaults={'valor': Decimal('12.5'), 'notas': 'Limpieza del manglar'})
        self.stdout.write(self.style.SUCCESS(f'Datos cargados. Clave de los usuarios demo: {CLAVE}'))
