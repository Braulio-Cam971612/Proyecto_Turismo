from django.db.models import ProtectedError, Q
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from turismo_backend.utilidades import (ADMIN, ANFITRION, ESTADOS_VIGENTES, numero, ordenar, paginar, prohibido, rol_de)
from django.utils.dateparse import parse_date

from .models import Hospedaje, Servicio
from .serializers import HospedajeSerializer, ServicioSerializer


def eliminar(objeto):
    try:
        objeto.delete()
    except ProtectedError:
        return Response({'detail': 'No se puede eliminar: tiene reservas u otros registros relacionados.'}, status=409)
    return Response(status=status.HTTP_204_NO_CONTENT)


def filtrar_hospedajes(request):
    hospedajes = Hospedaje.objects.select_related('anfitrion').prefetch_related('servicios').order_by('nombre')
    p = request.query_params
    if p.get('ubicacion'):
        hospedajes = hospedajes.filter(ubicacion__icontains=p['ubicacion'])
    if p.get('capacidad_min', '').isdigit():
        hospedajes = hospedajes.filter(capacidad_personas__gte=p['capacidad_min'])
    if numero(p.get('precio_max')) is not None:
        hospedajes = hospedajes.filter(precio_noche__lte=numero(p['precio_max']))
    if p.get('servicio', '').isdigit():
        hospedajes = hospedajes.filter(servicios__id=p['servicio'])
    if p.get('anfitrion', '').isdigit():
        hospedajes = hospedajes.filter(anfitrion_id=p['anfitrion'])
    if p.get('activo') in ('true', 'false'):
        hospedajes = hospedajes.filter(activo=p['activo'] == 'true')
    if p.get('search'):
        hospedajes = hospedajes.filter(Q(nombre__icontains=p['search']) | Q(ubicacion__icontains=p['search']) |
                                       Q(descripcion__icontains=p['search']))
    return ordenar(hospedajes, p.get('ordering'), ['nombre', 'precio_noche', 'capacidad_personas'])


# ---------------------------------------------------------------- hospedajes
@api_view(['GET', 'POST'])
def hospedajes_api(request):
    if request.method == 'GET':
        return paginar(request, filtrar_hospedajes(request), HospedajeSerializer)

    rol = rol_de(request.user)
    if rol not in (ADMIN, ANFITRION):
        return prohibido()
    datos = request.data.copy()
    if rol == ANFITRION:
        datos['anfitrion'] = request.user.id    # el anfitrion solo crea hospedajes a su nombre
    serializer = HospedajeSerializer(data=datos)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def hospedajes_disponibles_api(request):
    """Hospedajes activos sin reservas vigentes que se crucen con las fechas pedidas."""
    entrada = parse_date(request.query_params.get('entrada', ''))
    salida = parse_date(request.query_params.get('salida', ''))
    if not entrada or not salida:
        return Response({'detail': 'Indique entrada y salida con formato AAAA-MM-DD.'}, status=400)
    if salida <= entrada:
        return Response({'salida': 'La fecha de salida debe ser posterior a la de entrada.'}, status=400)

    ocupados = Hospedaje.objects.filter(
        reservas__estado__in=ESTADOS_VIGENTES,
        reservas__fecha_entrada__lt=salida,
        reservas__fecha_salida__gt=entrada,
    ).values('pk')
    hospedajes = filtrar_hospedajes(request).filter(activo=True).exclude(pk__in=ocupados)
    if request.query_params.get('huespedes', '').isdigit():
        hospedajes = hospedajes.filter(capacidad_personas__gte=request.query_params['huespedes'])
    return paginar(request, hospedajes, HospedajeSerializer)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def hospedaje_detalle_api(request, id):
    try:
        hospedaje = Hospedaje.objects.select_related('anfitrion').prefetch_related('servicios').get(id=id)
    except Hospedaje.DoesNotExist:
        return Response({'error': 'Hospedaje no encontrado.'}, status=404)

    if request.method == 'GET':
        return Response(HospedajeSerializer(hospedaje).data)

    rol = rol_de(request.user)
    if rol not in (ADMIN, ANFITRION) or (rol == ANFITRION and hospedaje.anfitrion != request.user):
        return prohibido()

    if request.method in ['PUT', 'PATCH']:
        datos = request.data.copy()
        if rol == ANFITRION:
            datos['anfitrion'] = request.user.id
        serializer = HospedajeSerializer(hospedaje, data=datos, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    return eliminar(hospedaje)


# ---------------------------------------------------------------- servicios
@api_view(['GET', 'POST'])
def servicios_api(request):
    if request.method == 'GET':
        return paginar(request, Servicio.objects.order_by('nombre'), ServicioSerializer)
    if rol_de(request.user) != ADMIN:
        return prohibido()
    serializer = ServicioSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def servicio_detalle_api(request, id):
    try:
        servicio = Servicio.objects.get(id=id)
    except Servicio.DoesNotExist:
        return Response({'error': 'Servicio no encontrado.'}, status=404)
    if request.method == 'GET':
        return Response(ServicioSerializer(servicio).data)
    if rol_de(request.user) != ADMIN:
        return prohibido()
    if request.method in ['PUT', 'PATCH']:
        serializer = ServicioSerializer(servicio, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    return eliminar(servicio)


# Create your views here.
