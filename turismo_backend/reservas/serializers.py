from django.utils import timezone
from rest_framework import serializers

from .models import Reserva


class ReservaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reserva
        fields = ['id', 'turista', 'salida', 'personas', 'hospedaje', 'fecha_entrada', 'fecha_salida',
                  'huespedes', 'estado', 'estado_pago', 'total', 'notas', 'fecha_creacion']
        read_only_fields = ['turista', 'estado', 'estado_pago', 'total', 'fecha_creacion']

    def validate(self, data):
        reserva = self.instance

        def valor(campo, defecto=None):      # dato nuevo o, si es PATCH, el valor actual
            if campo in data:
                return data[campo]
            return getattr(reserva, campo) if reserva else defecto

        if reserva:
            if reserva.estado != 'PENDIENTE':
                raise serializers.ValidationError('Solo se pueden modificar reservas pendientes.')
            for campo in ('salida', 'hospedaje'):
                if campo in data and data[campo] != getattr(reserva, campo):
                    raise serializers.ValidationError({campo: 'No se puede cambiar; cancele y cree otra reserva.'})

        salida, hospedaje = valor('salida'), valor('hospedaje')
        personas, huespedes = valor('personas', 0), valor('huespedes', 0)
        entrada, fin = valor('fecha_entrada'), valor('fecha_salida')
        if not salida and not hospedaje:
            raise serializers.ValidationError('La reserva debe incluir una salida de tour, un hospedaje o ambos.')

        errores = {}
        if salida:
            if reserva is None and not (salida.activo and salida.experiencia.activo):
                errores['salida'] = 'La salida o su experiencia está inactiva.'
            elif reserva is None and salida.fecha_hora <= timezone.now():
                errores['salida'] = 'La salida ya ocurrió.'
            if personas < 1:
                errores['personas'] = 'Indique al menos 1 persona para el tour.'
            elif personas > salida.experiencia.capacidad_maxima:
                errores['personas'] = 'Supera la capacidad máxima de la experiencia.'
        elif personas:
            errores['personas'] = 'Solo se indican personas cuando se reserva una salida.'

        if hospedaje:
            if reserva is None and not hospedaje.activo:
                errores['hospedaje'] = 'El hospedaje está inactivo.'
            if not entrada or not fin:
                errores['fecha_entrada'] = 'Indique fecha de entrada y de salida del hospedaje.'
            else:
                if fin <= entrada:
                    errores['fecha_salida'] = 'La fecha de salida debe ser posterior a la de entrada.'
                if (reserva is None or 'fecha_entrada' in data) and entrada < timezone.localdate():
                    errores['fecha_entrada'] = 'La fecha de entrada no puede estar en el pasado.'
            if huespedes < 1:
                errores['huespedes'] = 'Indique al menos 1 huésped.'
            elif huespedes > hospedaje.capacidad_personas:
                errores['huespedes'] = 'Supera la capacidad del hospedaje.'
        elif huespedes or entrada or fin:
            errores['hospedaje'] = 'Huéspedes y fechas solo aplican al reservar un hospedaje.'

        if errores:
            raise serializers.ValidationError(errores)
        return data