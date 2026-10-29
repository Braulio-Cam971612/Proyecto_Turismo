"""Pruebas automatizadas: CRUD, reglas de negocio, permisos, paginación y filtros."""
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from experiencias.models import Experiencia, Salida
from hospedajes.models import Hospedaje
from reservas.models import Reserva
from usuarios.models import Perfil


class PruebaBase(APITestCase):
    def setUp(self):
        self.admin = self.crear_usuario('admin', 'ADMIN')
        self.guia = self.crear_usuario('guia', 'GUIA')
        self.otro_guia = self.crear_usuario('otro_guia', 'GUIA')
        self.anfitrion = self.crear_usuario('anfitrion', 'ANFITRION')
        self.turista = self.crear_usuario('turista', 'TURISTA')
        self.otro_turista = self.crear_usuario('otro_turista', 'TURISTA')

        self.experiencia = Experiencia.objects.create(
            nombre='Caminata nocturna', categoria='CAMINATA', precio_persona=Decimal('15000'),
            capacidad_maxima=4, guia=self.guia)
        self.salida = Salida.objects.create(
            experiencia=self.experiencia, fecha_hora=timezone.now() + timedelta(days=10))
        self.hospedaje = Hospedaje.objects.create(
            nombre='Casa Rosa', ubicacion='Chacarita', anfitrion=self.anfitrion,
            precio_noche=Decimal('25000'), capacidad_personas=3)

        hoy = timezone.localdate()
        self.fecha_entrada = hoy + timedelta(days=5)
        self.fecha_salida = hoy + timedelta(days=7)

    def crear_usuario(self, username, rol):
        usuario = User.objects.create_user(username, f'{username}@ejemplo.com', 'Clave12345')
        Perfil.objects.create(user=usuario, rol=rol)
        return usuario

    def autenticar_como(self, usuario):
        token, _ = Token.objects.get_or_create(user=usuario)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def reservar_tour(self, usuario, personas=2):
        self.autenticar_como(usuario)
        return self.client.post(
            '/api/reservas/', {'salida': self.salida.id, 'personas': personas}, format='json')

    def datos_reserva_hospedaje(self):
        return {
            'hospedaje': self.hospedaje.id,
            'huespedes': 2,
            'fecha_entrada': str(self.fecha_entrada),
            'fecha_salida': str(self.fecha_salida),
        }

    def crear_reserva_pagada(self, personas=2):
        respuesta = self.reservar_tour(self.turista, personas)
        self.autenticar_como(self.admin)
        self.client.post(f"/api/reservas/{respuesta.data['id']}/pagar/")
        return Reserva.objects.get(pk=respuesta.data['id'])


# ----------------------------- CRUD -----------------------------
class PruebasCrud(PruebaBase):
    def test_guia_puede_crear_una_experiencia(self):
        self.autenticar_como(self.guia)
        respuesta = self.client.post('/api/experiencias/', {
            'nombre': 'Taller de cacao', 'categoria': 'TALLER', 'precio_persona': '20000',
            'capacidad_maxima': 8}, format='json')
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['guia'], self.guia.id)

    def test_turista_puede_listar_y_ver_detalle_de_experiencia(self):
        self.autenticar_como(self.turista)
        self.assertEqual(self.client.get('/api/experiencias/').status_code, 200)
        respuesta = self.client.get(f'/api/experiencias/{self.experiencia.id}/')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['nombre'], 'Caminata nocturna')

    def test_guia_puede_actualizar_el_precio_de_su_experiencia(self):
        self.autenticar_como(self.guia)
        respuesta = self.client.patch(
            f'/api/experiencias/{self.experiencia.id}/', {'precio_persona': '18000'}, format='json')
        self.assertEqual(respuesta.status_code, 200)
        self.experiencia.refresh_from_db()
        self.assertEqual(self.experiencia.precio_persona, Decimal('18000.00'))

    def test_guia_puede_eliminar_experiencia_sin_reservas(self):
        self.autenticar_como(self.guia)
        respuesta = self.client.delete(f'/api/experiencias/{self.experiencia.id}/')
        self.assertEqual(respuesta.status_code, 204)
        self.assertFalse(Experiencia.objects.filter(pk=self.experiencia.id).exists())

    def test_anfitrion_puede_crear_un_hospedaje(self):
        self.autenticar_como(self.anfitrion)
        respuesta = self.client.post('/api/hospedajes/', {
            'nombre': 'Cabaña Mangle', 'ubicacion': 'Isla Chira', 'precio_noche': '30000',
            'capacidad_personas': 5}, format='json')
        self.assertEqual(respuesta.status_code, 201)

    def test_turista_puede_reservar_un_tour_y_se_calcula_el_total(self):
        respuesta = self.reservar_tour(self.turista, 2)
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(Decimal(respuesta.data['total']), Decimal('30000'))
        self.assertEqual(respuesta.data['estado'], 'PENDIENTE')

    def test_admin_puede_crear_un_usuario_con_rol(self):
        self.autenticar_como(self.admin)
        respuesta = self.client.post('/api/usuarios/', {
            'username': 'nuevo', 'email': 'nuevo@ejemplo.com',
            'password': 'Clave12345', 'rol': 'GUIA'}, format='json')
        self.assertEqual(respuesta.status_code, 201)
        self.assertEqual(respuesta.data['rol'], 'GUIA')


# ------------------------- REGLAS DE NEGOCIO -------------------------
class PruebasReglasDeNegocio(PruebaBase):
    def test_no_se_puede_reservar_mas_personas_que_la_capacidad(self):
        respuesta = self.reservar_tour(self.turista, 99)
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('personas', respuesta.data)

    def test_cupo_agotado_devuelve_conflicto(self):
        self.assertEqual(self.reservar_tour(self.turista, 3).status_code, 201)
        respuesta = self.reservar_tour(self.otro_turista, 2)   # 3 + 2 supera la capacidad de 4
        self.assertEqual(respuesta.status_code, 409)

    def test_hospedaje_ocupado_en_las_mismas_fechas_devuelve_conflicto(self):
        datos = self.datos_reserva_hospedaje()
        self.autenticar_como(self.turista)
        self.assertEqual(self.client.post('/api/reservas/', datos, format='json').status_code, 201)
        self.autenticar_como(self.otro_turista)
        self.assertEqual(self.client.post('/api/reservas/', datos, format='json').status_code, 409)

    def test_fecha_de_salida_anterior_a_la_entrada_es_invalida(self):
        self.autenticar_como(self.turista)
        datos = self.datos_reserva_hospedaje()
        datos['fecha_entrada'], datos['fecha_salida'] = datos['fecha_salida'], datos['fecha_entrada']
        respuesta = self.client.post('/api/reservas/', datos, format='json')
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('fecha_salida', respuesta.data)

    def test_patch_no_permite_romper_las_reglas_de_la_reserva(self):
        reserva = self.reservar_tour(self.turista, 2)
        id_reserva = reserva.data['id']

        exceso_de_personas = self.client.patch(
            f'/api/reservas/{id_reserva}/', {'personas': 99}, format='json')
        self.assertEqual(exceso_de_personas.status_code, 400)

        otra_salida = Salida.objects.create(
            experiencia=self.experiencia, fecha_hora=timezone.now() + timedelta(days=20))
        cambio_de_salida = self.client.patch(
            f'/api/reservas/{id_reserva}/', {'salida': otra_salida.id}, format='json')
        self.assertEqual(cambio_de_salida.status_code, 400)

    def test_no_se_puede_resenar_una_reserva_que_no_esta_completada(self):
        reserva = self.reservar_tour(self.turista, 1)
        respuesta = self.client.post(
            '/api/resenas/', {'reserva': reserva.data['id'], 'calificacion': 5}, format='json')
        self.assertEqual(respuesta.status_code, 400)

    def test_resena_valida_calificacion_y_rechaza_duplicados(self):
        reserva = self.crear_reserva_pagada(1)
        # La salida ya ocurrió, así que el guía puede completar la reserva
        Salida.objects.filter(pk=self.salida.pk).update(fecha_hora=timezone.now() - timedelta(days=1))
        self.autenticar_como(self.guia)
        self.assertEqual(self.client.post(f'/api/reservas/{reserva.id}/completar/').status_code, 200)

        self.autenticar_como(self.turista)
        calificacion_invalida = self.client.post(
            '/api/resenas/', {'reserva': reserva.id, 'calificacion': 6}, format='json')
        self.assertEqual(calificacion_invalida.status_code, 400)

        resena_correcta = self.client.post(
            '/api/resenas/', {'reserva': reserva.id, 'calificacion': 5}, format='json')
        self.assertEqual(resena_correcta.status_code, 201)

        resena_duplicada = self.client.post(
            '/api/resenas/', {'reserva': reserva.id, 'calificacion': 4}, format='json')
        self.assertEqual(resena_duplicada.status_code, 409)

    def test_pagar_genera_distribucion_y_no_se_puede_pagar_dos_veces(self):
        reserva = self.crear_reserva_pagada(2)
        self.assertEqual(reserva.estado_pago, 'PAGADO')
        self.assertEqual(reserva.distribucion.monto_comunidad, Decimal('21000.00'))   # 70 % de 30000
        self.autenticar_como(self.admin)
        self.assertEqual(self.client.post(f'/api/reservas/{reserva.id}/pagar/').status_code, 409)

    def test_no_se_puede_crear_una_salida_en_el_pasado(self):
        self.autenticar_como(self.guia)
        ayer = timezone.now() - timedelta(days=1)
        respuesta = self.client.post('/api/salidas/', {
            'experiencia': self.experiencia.id, 'fecha_hora': ayer.isoformat()}, format='json')
        self.assertEqual(respuesta.status_code, 400)

    def test_precio_negativo_es_invalido(self):
        self.autenticar_como(self.guia)
        respuesta = self.client.post('/api/experiencias/', {
            'nombre': 'Experiencia inválida', 'categoria': 'TALLER',
            'precio_persona': '-5', 'capacidad_maxima': 3}, format='json')
        self.assertEqual(respuesta.status_code, 400)

    def test_no_se_puede_eliminar_una_experiencia_con_reservas(self):
        self.reservar_tour(self.turista, 1)
        self.autenticar_como(self.guia)
        respuesta = self.client.delete(f'/api/experiencias/{self.experiencia.id}/')
        self.assertEqual(respuesta.status_code, 409)

    def test_cancelar_una_reserva_pagada_la_marca_como_reembolsada(self):
        reserva = self.crear_reserva_pagada(1)
        self.autenticar_como(self.turista)
        respuesta = self.client.post(f'/api/reservas/{reserva.id}/cancelar/')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['estado_pago'], 'REEMBOLSADO')


# ------------------------------ PERMISOS ------------------------------
class PruebasPermisos(PruebaBase):
    def test_sin_token_no_se_puede_acceder(self):
        self.assertEqual(self.client.get('/api/experiencias/').status_code, 401)

    def test_turista_no_puede_crear_experiencias(self):
        self.autenticar_como(self.turista)
        respuesta = self.client.post('/api/experiencias/', {
            'nombre': 'Experiencia no permitida', 'categoria': 'TALLER',
            'precio_persona': '100', 'capacidad_maxima': 3}, format='json')
        self.assertEqual(respuesta.status_code, 403)

    def test_guia_no_puede_editar_la_experiencia_de_otro_guia(self):
        self.autenticar_como(self.otro_guia)
        respuesta = self.client.patch(
            f'/api/experiencias/{self.experiencia.id}/', {'activo': False}, format='json')
        self.assertEqual(respuesta.status_code, 403)

    def test_solo_el_admin_puede_pagar_ver_reportes_y_listar_usuarios(self):
        reserva = self.reservar_tour(self.turista, 1)
        self.assertEqual(self.client.post(f"/api/reservas/{reserva.data['id']}/pagar/").status_code, 403)
        self.assertEqual(self.client.get('/api/reportes/experiencias-top/').status_code, 403)
        self.assertEqual(self.client.get('/api/usuarios/').status_code, 403)

        self.autenticar_como(self.admin)
        self.assertEqual(self.client.get('/api/reportes/experiencias-top/').status_code, 200)

    def test_turista_no_puede_ver_las_reservas_de_otro_turista(self):
        reserva = self.reservar_tour(self.turista, 1)
        self.autenticar_como(self.otro_turista)
        self.assertEqual(self.client.get(f"/api/reservas/{reserva.data['id']}/").status_code, 404)
        self.assertEqual(self.client.get('/api/reservas/').data['total_registros'], 0)


# ------------------------ PAGINACIÓN, FILTROS Y REPORTES ------------------------
class PruebasConsultas(PruebaBase):
    def test_listado_de_experiencias_con_paginacion_filtro_busqueda_y_orden(self):
        for numero in range(7):
            Experiencia.objects.create(
                nombre=f'Taller {numero}', categoria='TALLER', precio_persona=Decimal(1000 + numero),
                capacidad_maxima=5, guia=self.guia)

        self.autenticar_como(self.turista)
        respuesta = self.client.get(
            '/api/experiencias/?categoria=TALLER&page_size=5&ordering=-precio_persona')
        self.assertEqual(respuesta.status_code, 200)
        self.assertEqual(respuesta.data['total_registros'], 7)
        self.assertEqual(len(respuesta.data['resultados']), 5)
        self.assertEqual(respuesta.data['resultados'][0]['nombre'], 'Taller 6')

        busqueda = self.client.get('/api/experiencias/?search=nocturna')
        self.assertEqual(busqueda.data['total_registros'], 1)

    def test_hospedajes_disponibles_excluye_los_ya_reservados(self):
        self.autenticar_como(self.turista)
        self.client.post('/api/reservas/', self.datos_reserva_hospedaje(), format='json')

        fechas_ocupadas = f'?entrada={self.fecha_entrada}&salida={self.fecha_salida}'
        ocupado = self.client.get('/api/hospedajes/disponibles/' + fechas_ocupadas)
        self.assertEqual(ocupado.data['total_registros'], 0)

        despues = self.fecha_salida + timedelta(days=2)
        fechas_libres = f'?entrada={self.fecha_salida}&salida={despues}'
        libre = self.client.get('/api/hospedajes/disponibles/' + fechas_libres)
        self.assertEqual(libre.data['total_registros'], 1)

    def test_reportes_del_admin_devuelven_datos(self):
        self.crear_reserva_pagada(2)
        self.autenticar_como(self.admin)
        reportes = ('ingresos-por-experiencia', 'ocupacion-salidas',
                    'hospedajes-demanda', 'resumen-sostenibilidad')
        for reporte in reportes:
            respuesta = self.client.get(f'/api/reportes/{reporte}/')
            self.assertEqual(respuesta.status_code, 200, reporte)

        ingresos = self.client.get('/api/reportes/ingresos-por-experiencia/')
        self.assertEqual(ingresos.data[0]['reservas_pagadas'], 1)