"""Funciones sencillas que se repiten en varios modulos."""
from decimal import Decimal, InvalidOperation

from django.core.paginator import Paginator
from rest_framework.response import Response

ADMIN, GUIA, ANFITRION, TURISTA = 'ADMIN', 'GUIA', 'ANFITRION', 'TURISTA'
ESTADOS_VIGENTES = ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA']   # todas menos CANCELADA


def rol_de(user):
    """Rol del usuario. Un superusuario de Django cuenta como ADMIN."""
    if user.is_superuser:
        return ADMIN
    perfil = getattr(user, 'perfil', None)
    return perfil.rol if perfil else None


def prohibido():
    return Response({'detail': 'Su rol no tiene permiso para esta operación.'}, status=403)


def buscar(modelo, valor):
    """Devuelve el objeto con ese id, o None si el id no existe o no es numero."""
    if str(valor).isdigit():
        return modelo.objects.filter(pk=int(valor)).first()
    return None


def numero(valor):
    try:
        return Decimal(valor)
    except (InvalidOperation, TypeError):
        return None


def ordenar(queryset, campo, permitidos):
    if campo and campo.lstrip('-') in permitidos:
        return queryset.order_by(campo)
    return queryset


def paginar(request, queryset, serializer_class):
    try:
        tamano = min(max(int(request.query_params.get('page_size', 10)), 1), 50)
    except ValueError:
        tamano = 10
    paginator = Paginator(queryset, tamano)
    page = paginator.get_page(request.query_params.get('page', 1))
    return Response({
        'pagina_actual': page.number,
        'total_paginas': paginator.num_pages,
        'total_registros': paginator.count,
        'resultados': serializer_class(page.object_list, many=True).data,
    })
