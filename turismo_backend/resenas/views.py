from decimal import Decimal

from django.db.models import Avg, Count, DecimalField, ExpressionWrapper, F, Q, Sum
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from experiencias.models import Experiencia, Salida
from hospedajes.models import Hospedaje
from reservas.models import Reserva
from turismo_backend.utilidades import ADMIN, GUIA, TURISTA, buscar, ordenar, paginar, prohibido, rol_de

from .models import DistribucionIngreso, MetricaSostenibilidad, Resena
from .serializers import DistribucionSerializer, MetricaSerializer, ResenaSerializer


@api_view(['GET', 'POST'])
def resenas_api(request):
    if request.method == 'GET':
        resenas = (Resena.objects
                   .select_related('reserva__turista', 'reserva__salida__experiencia', 'reserva__hospedaje')
                   .order_by('-fecha_creacion'))
        p = request.query_params
        if p.get('experiencia', '').isdigit():
            resenas = resenas.filter(reserva__salida__experiencia_id=p['experiencia'])
        if p.get('hospedaje', '').isdigit():
            resenas = resenas.filter(reserva__hospedaje_id=p['hospedaje'])
        if p.get('calificacion_min', '').isdigit():
            resenas = resenas.filter(calificacion__gte=p['calificacion_min'])
        resenas = ordenar(resenas, p.get('ordering'), ['calificacion', 'fecha_creacion'])
        return paginar(request, resenas, ResenaSerializer)

    rol = rol_de(request.user)
    if rol not in (ADMIN, TURISTA):
        return prohibido()
    reserva = buscar(Reserva, request.data.get('reserva'))
    if reserva:
        if rol == TURISTA and reserva.turista != request.user:
            return prohibido()
        if Resena.objects.filter(reserva=reserva).exists():
            return Response({'detail': 'Esta reserva ya tiene una reseña.'}, status=status.HTTP_409_CONFLICT)
    serializer = ResenaSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def resena_detalle_api(request, id):
    try:
        resena = Resena.objects.select_related('reserva__turista').get(id=id)
    except Resena.DoesNotExist:
        return Response({'error': 'Reseña no encontrada.'}, status=404)

    if request.method == 'GET':
        return Response(ResenaSerializer(resena).data)

    rol = rol_de(request.user)
    if rol not in (ADMIN, TURISTA) or (rol == TURISTA and resena.reserva.turista != request.user):
        return prohibido()

    if request.method in ['PUT', 'PATCH']:
        serializer = ResenaSerializer(resena, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    resena.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
def metricas_api(request):
    if request.method == 'GET':
        metricas = MetricaSostenibilidad.objects.select_related('experiencia').order_by('-fecha', '-id')
        p = request.query_params
        if p.get('experiencia', '').isdigit():
            metricas = metricas.filter(experiencia_id=p['experiencia'])
        if p.get('tipo'):
            metricas = metricas.filter(tipo=p['tipo'].upper())
        return paginar(request, metricas, MetricaSerializer)

    rol = rol_de(request.user)
    if rol not in (ADMIN, GUIA):
        return prohibido()
    experiencia = buscar(Experiencia, request.data.get('experiencia'))
    if experiencia and rol == GUIA and experiencia.guia != request.user:
        return prohibido()
    serializer = MetricaSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def metrica_detalle_api(request, id):
    try:
        metrica = MetricaSostenibilidad.objects.select_related('experiencia__guia').get(id=id)
    except MetricaSostenibilidad.DoesNotExist:
        return Response({'error': 'Métrica no encontrada.'}, status=404)

    if request.method == 'GET':
        return Response(MetricaSerializer(metrica).data)

    rol = rol_de(request.user)
    if rol not in (ADMIN, GUIA) or (rol == GUIA and metrica.experiencia.guia != request.user):
        return prohibido()

    if request.method in ['PUT', 'PATCH']:
        serializer = MetricaSerializer(metrica, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    metrica.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def distribuciones_api(request):
    if rol_de(request.user) != ADMIN:
        return prohibido()
    distribuciones = DistribucionIngreso.objects.select_related('reserva').order_by('-fecha')
    return paginar(request, distribuciones, DistribucionSerializer)


@api_view(['GET'])
def distribucion_detalle_api(request, id):
    if rol_de(request.user) != ADMIN:
        return prohibido()
    try:
        distribucion = DistribucionIngreso.objects.get(id=id)
    except DistribucionIngreso.DoesNotExist:
        return Response({'error': 'Distribución no encontrada.'}, status=404)
    return Response(DistribucionSerializer(distribucion).data)


@api_view(['GET'])
def experiencias_top(request):
    """Mejores experiencias por calificacion promedio (agregacion + join de 3 niveles + select_related)."""
    if rol_de(request.user) != ADMIN:
        return prohibido()
    qs = (Experiencia.objects.select_related('guia')
          .annotate(promedio=Avg('salidas__reservas__resena__calificacion'),
                    total_resenas=Count('salidas__reservas__resena'))
          .filter(total_resenas__gt=0).order_by('-promedio', '-total_resenas')[:10])
    return Response([{'id': e.id, 'nombre': e.nombre, 'guia': e.guia.username,
                      'promedio': round(e.promedio, 2), 'total_resenas': e.total_resenas} for e in qs])


@api_view(['GET'])
def ingresos_por_experiencia(request):
    """Ingresos de tours ya pagados por experiencia (Sum con filtro por relacion)."""
    if rol_de(request.user) != ADMIN:
        return prohibido()
    ingreso = ExpressionWrapper(F('salidas__reservas__personas') * F('precio_persona'),
                                output_field=DecimalField(max_digits=14, decimal_places=2))
    qs = (Experiencia.objects
          .annotate(ingresos=Sum(ingreso, filter=Q(salidas__reservas__estado_pago='PAGADO')),
                    reservas_pagadas=Count('salidas__reservas', filter=Q(salidas__reservas__estado_pago='PAGADO')))
          .filter(reservas_pagadas__gt=0).order_by('-ingresos'))
    return Response([{'id': e.id, 'nombre': e.nombre, 'reservas_pagadas': e.reservas_pagadas,
                      'ingresos': e.ingresos} for e in qs])


@api_view(['GET'])
def ocupacion_salidas(request):
    """Porcentaje de ocupacion de las proximas salidas (Sum condicional)."""
    if rol_de(request.user) != ADMIN:
        return prohibido()
    qs = (Salida.objects.select_related('experiencia')
          .annotate(ocupados=Sum('reservas__personas', filter=~Q(reservas__estado='CANCELADA')))
          .order_by('fecha_hora')[:50])
    datos = []
    for s in qs:
        ocupados = s.ocupados or 0
        capacidad = s.experiencia.capacidad_maxima
        datos.append({'salida': s.id, 'experiencia': s.experiencia.nombre, 'fecha_hora': s.fecha_hora,
                      'ocupados': ocupados, 'capacidad': capacidad,
                      'ocupacion_pct': round(ocupados * 100 / capacidad, 1)})
    return Response(datos)


@api_view(['GET'])
def hospedajes_demanda(request):
    """Hospedajes ordenados por reservas vigentes (Count condicional + prefetch_related)."""
    if rol_de(request.user) != ADMIN:
        return prohibido()
    qs = (Hospedaje.objects.select_related('anfitrion').prefetch_related('servicios')
          .annotate(reservas_vigentes=Count('reservas', filter=~Q(reservas__estado='CANCELADA')))
          .order_by('-reservas_vigentes', 'nombre'))
    return Response([{'id': h.id, 'nombre': h.nombre, 'anfitrion': h.anfitrion.username,
                      'servicios': [s.nombre for s in h.servicios.all()],
                      'reservas_vigentes': h.reservas_vigentes} for h in qs])


@api_view(['GET'])
def resumen_sostenibilidad(request):
    """Distribucion de ingresos a la comunidad, reservas por estado y metricas ambientales."""
    if rol_de(request.user) != ADMIN:
        return prohibido()
    ingresos = DistribucionIngreso.objects.aggregate(
        total=Sum('monto_total'), comunidad=Sum('monto_comunidad'), asociacion=Sum('monto_asociacion'))
    return Response({
        'ingresos': {k: v or Decimal('0') for k, v in ingresos.items()},
        'reservas_por_estado': list(Reserva.objects.values('estado').annotate(total=Count('id')).order_by('estado')),
        'metricas_ambientales': list(MetricaSostenibilidad.objects.values('tipo')
                                     .annotate(total=Sum('valor')).order_by('tipo')),
    })


# Create your views here.
