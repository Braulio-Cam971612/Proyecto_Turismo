from django.db.models import ProtectedError, Q
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from turismo_backend.utilidades import ADMIN, GUIA, buscar, numero, ordenar, paginar, prohibido, rol_de

from .models import Experiencia, Salida
from .serializers import ExperienciaSerializer, SalidaSerializer


def eliminar(objeto):
    """Borra el objeto. Si tiene reservas asociadas (PROTECT) responde 409."""
    try:
        objeto.delete()
    except ProtectedError:
        return Response({'detail': 'No se puede eliminar: tiene reservas u otros registros relacionados.'}, status=409)
    return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------- experiencias
@api_view(['GET', 'POST'])
def experiencias_api(request):
    if request.method == 'GET':
        experiencias = Experiencia.objects.select_related('guia').order_by('nombre')
        p = request.query_params
        if p.get('categoria'):
            experiencias = experiencias.filter(categoria=p['categoria'].upper())
        if p.get('guia', '').isdigit():
            experiencias = experiencias.filter(guia_id=p['guia'])
        if p.get('activo') in ('true', 'false'):
            experiencias = experiencias.filter(activo=p['activo'] == 'true')
        if numero(p.get('precio_min')) is not None:
            experiencias = experiencias.filter(precio_persona__gte=numero(p['precio_min']))
        if numero(p.get('precio_max')) is not None:
            experiencias = experiencias.filter(precio_persona__lte=numero(p['precio_max']))
        if p.get('search'):
            experiencias = experiencias.filter(Q(nombre__icontains=p['search']) | Q(descripcion__icontains=p['search']))
        experiencias = ordenar(experiencias, p.get('ordering'), ['nombre', 'precio_persona', 'capacidad_maxima'])
        return paginar(request, experiencias, ExperienciaSerializer)

    rol = rol_de(request.user)
    if rol not in (ADMIN, GUIA):
        return prohibido()
    datos = request.data.copy()
    if rol == GUIA:
        datos['guia'] = request.user.id        # el guia solo crea experiencias a su nombre
    serializer = ExperienciaSerializer(data=datos)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def experiencia_detalle_api(request, id):
    try:
        experiencia = Experiencia.objects.select_related('guia').get(id=id)
    except Experiencia.DoesNotExist:
        return Response({'error': 'Experiencia no encontrada.'}, status=404)

    if request.method == 'GET':
        return Response(ExperienciaSerializer(experiencia).data)

    rol = rol_de(request.user)
    if rol not in (ADMIN, GUIA) or (rol == GUIA and experiencia.guia != request.user):
        return prohibido()

    if request.method in ['PUT', 'PATCH']:
        datos = request.data.copy()
        if rol == GUIA:
            datos['guia'] = request.user.id
        serializer = ExperienciaSerializer(experiencia, data=datos, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    return eliminar(experiencia)


# ---------------------------------------------------------------- salidas
@api_view(['GET', 'POST'])
def salidas_api(request):
    if request.method == 'GET':
        salidas = Salida.objects.select_related('experiencia').order_by('fecha_hora')
        p = request.query_params
        if p.get('experiencia', '').isdigit():
            salidas = salidas.filter(experiencia_id=p['experiencia'])
        if parse_date(p.get('desde', '')):
            salidas = salidas.filter(fecha_hora__date__gte=parse_date(p['desde']))
        if parse_date(p.get('hasta', '')):
            salidas = salidas.filter(fecha_hora__date__lte=parse_date(p['hasta']))
        if p.get('activo') in ('true', 'false'):
            salidas = salidas.filter(activo=p['activo'] == 'true')
        if p.get('futuras') == 'true':
            salidas = salidas.filter(fecha_hora__gt=timezone.now())
        return paginar(request, salidas, SalidaSerializer)

    rol = rol_de(request.user)
    if rol not in (ADMIN, GUIA):
        return prohibido()
    experiencia = buscar(Experiencia, request.data.get('experiencia'))
    if experiencia and rol == GUIA and experiencia.guia != request.user:
        return prohibido()
    serializer = SalidaSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def salida_detalle_api(request, id):
    try:
        salida = Salida.objects.select_related('experiencia__guia').get(id=id)
    except Salida.DoesNotExist:
        return Response({'error': 'Salida no encontrada.'}, status=404)

    if request.method == 'GET':
        return Response(SalidaSerializer(salida).data)

    rol = rol_de(request.user)
    if rol not in (ADMIN, GUIA) or (rol == GUIA and salida.experiencia.guia != request.user):
        return prohibido()

    if request.method in ['PUT', 'PATCH']:
        serializer = SalidaSerializer(salida, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    return eliminar(salida)
