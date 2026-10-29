from django.shortcuts import render
from django.conf import settings
from django.db import transaction
from django.db.models import ProtectedError, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from resenas.models import DistribucionIngreso
from turismo_backend.utilidades import (ADMIN, ANFITRION, ESTADOS_VIGENTES, GUIA, TURISTA, numero, ordenar,
                                        paginar, prohibido, rol_de)

from .models import Reserva
from .serializers import ReservaSerializer


def reservas_visibles(user):
    """Cada rol ve solo lo suyo: el turista sus reservas, el guia las de sus tours, etc."""
    reservas = (Reserva.objects.select_related('turista', 'salida__experiencia', 'hospedaje')
                .order_by('-fecha_creacion', '-id'))
    rol = rol_de(user)
    if rol == ADMIN:
        return reservas
    if rol == TURISTA:
        return reservas.filter(turista=user)
    if rol == GUIA:
        return reservas.filter(salida__experiencia__guia=user)
    if rol == ANFITRION:
        return reservas.filter(hospedaje__anfitrion=user)
    return reservas.none()


def calcular_total(salida, personas, hospedaje, entrada, fin):
    total = Decimal('0')
    if salida:
        total += salida.experiencia.precio_persona * personas
    if hospedaje:
        total += hospedaje.precio_noche * (fin - entrada).days
    return total


def revisar_conflictos(salida, personas, hospedaje, entrada, fin, excluir_id=None):
    """Devuelve un mensaje si hay conflicto (se responde 409) o None si todo esta bien."""
    if salida:
        ocupados = (salida.reservas.exclude(estado='CANCELADA').exclude(pk=excluir_id)
                    .aggregate(t=Sum('personas'))['t'] or 0)
        disponibles = salida.experiencia.capacidad_maxima - ocupados
        if personas > disponibles:
            return f'Cupo agotado: solo quedan {max(disponibles, 0)} lugares.'
    if hospedaje:
        cruce = (hospedaje.reservas.filter(estado__in=ESTADOS_VIGENTES).exclude(pk=excluir_id)
                 .filter(fecha_entrada__lt=fin, fecha_salida__gt=entrada))
        if cruce.exists():
            return 'El hospedaje ya está reservado en esas fechas.'
    return None


@api_view(['GET', 'POST'])
def reservas_api(request):
    if request.method == 'GET':
        reservas = reservas_visibles(request.user)
        p = request.query_params
        if p.get('estado'):
            reservas = reservas.filter(estado=p['estado'].upper())
        if p.get('estado_pago'):
            reservas = reservas.filter(estado_pago=p['estado_pago'].upper())
        if p.get('experiencia', '').isdigit():
            reservas = reservas.filter(salida__experiencia_id=p['experiencia'])
        if p.get('hospedaje', '').isdigit():
            reservas = reservas.filter(hospedaje_id=p['hospedaje'])
        if numero(p.get('total_min')) is not None:
            reservas = reservas.filter(total__gte=numero(p['total_min']))
        reservas = ordenar(reservas, p.get('ordering'), ['fecha_creacion', 'total', 'fecha_entrada'])
        return paginar(request, reservas, ReservaSerializer)

    if rol_de(request.user) not in (ADMIN, TURISTA):
        return prohibido()
    serializer = ReservaSerializer(data=request.data)
    if serializer.is_valid():
        d = serializer.validated_data
        salida, hospedaje = d.get('salida'), d.get('hospedaje')
        personas, entrada, fin = d.get('personas', 0), d.get('fecha_entrada'), d.get('fecha_salida')
        conflicto = revisar_conflictos(salida, personas, hospedaje, entrada, fin)
        if conflicto:
            return Response({'detail': conflicto}, status=status.HTTP_409_CONFLICT)
        total = calcular_total(salida, personas, hospedaje, entrada, fin)
        serializer.save(turista=request.user, total=total)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def reserva_detalle_api(request, id):
    try:
        reserva = reservas_visibles(request.user).get(id=id)
    except Reserva.DoesNotExist:
        return Response({'error': 'Reserva no encontrada.'}, status=404)

    if request.method == 'GET':
        return Response(ReservaSerializer(reserva).data)

    rol = rol_de(request.user)
    if request.method in ['PUT', 'PATCH']:
        if rol not in (ADMIN, TURISTA):
            return prohibido()
        serializer = ReservaSerializer(reserva, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            d = serializer.validated_data
            personas = d.get('personas', reserva.personas)
            entrada = d.get('fecha_entrada', reserva.fecha_entrada)
            fin = d.get('fecha_salida', reserva.fecha_salida)
            conflicto = revisar_conflictos(reserva.salida, personas, reserva.hospedaje, entrada, fin, reserva.id)
            if conflicto:
                return Response({'detail': conflicto}, status=409)
            total = calcular_total(reserva.salida, personas, reserva.hospedaje, entrada, fin)
            serializer.save(total=total)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if rol != ADMIN:
        return prohibido()
    try:
        reserva.delete()
    except ProtectedError:
        return Response({'detail': 'No se puede eliminar la reserva.'}, status=409)
    return Response(status=status.HTTP_204_NO_CONTENT)


def buscar_reserva(request, id):
    return reservas_visibles(request.user).filter(id=id).first()


@api_view(['POST'])
def reserva_pagar_api(request, id):
    """Registra el pago y genera la distribucion de ingresos (comunidad / asociacion)."""
    if rol_de(request.user) != ADMIN:
        return prohibido()
    reserva = buscar_reserva(request, id)
    if reserva is None:
        return Response({'error': 'Reserva no encontrada.'}, status=404)
    if reserva.estado != 'PENDIENTE' or reserva.estado_pago != 'PENDIENTE':
        return Response({'detail': 'La reserva no admite pago en su estado actual.'}, status=409)

    porcentaje = Decimal(settings.PORCENTAJE_COMUNIDAD)
    comunidad = (reserva.total * porcentaje / 100).quantize(Decimal('0.01'))
    with transaction.atomic():
        reserva.estado = 'CONFIRMADA'
        reserva.estado_pago = 'PAGADO'
        reserva.save()
        DistribucionIngreso.objects.create(
            reserva=reserva, monto_total=reserva.total, porcentaje_comunidad=porcentaje,
            monto_comunidad=comunidad, monto_asociacion=reserva.total - comunidad)
    return Response(ReservaSerializer(reserva).data)


@api_view(['POST'])
def reserva_cancelar_api(request, id):
    if rol_de(request.user) not in (ADMIN, TURISTA):
        return prohibido()
    reserva = buscar_reserva(request, id)
    if reserva is None:
        return Response({'error': 'Reserva no encontrada.'}, status=404)
    if reserva.estado not in ('PENDIENTE', 'CONFIRMADA'):
        return Response({'detail': 'Solo se pueden cancelar reservas pendientes o confirmadas.'}, status=400)
    if reserva.estado_pago == 'PAGADO':
        reserva.estado_pago = 'REEMBOLSADO'
        DistribucionIngreso.objects.filter(reserva=reserva).delete()
    reserva.estado = 'CANCELADA'
    reserva.save()
    return Response(ReservaSerializer(reserva).data)


@api_view(['POST'])
def reserva_completar_api(request, id):
    if rol_de(request.user) not in (ADMIN, GUIA, ANFITRION):
        return prohibido()
    reserva = buscar_reserva(request, id)
    if reserva is None:
        return Response({'error': 'Reserva no encontrada.'}, status=404)
    if reserva.estado != 'CONFIRMADA':
        return Response({'detail': 'Solo se pueden completar reservas confirmadas (pagadas).'}, status=400)
    if reserva.salida and reserva.salida.fecha_hora > timezone.now():
        return Response({'detail': 'La salida del tour aún no se ha realizado.'}, status=400)
    if reserva.hospedaje and reserva.fecha_salida > timezone.localdate():
        return Response({'detail': 'La estadía en el hospedaje aún no ha terminado.'}, status=400)
    reserva.estado = 'COMPLETADA'
    reserva.save()
    return Response(ReservaSerializer(reserva).data)

