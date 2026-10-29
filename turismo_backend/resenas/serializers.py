from django.utils import timezone
from rest_framework import serializers

from reservas.models import Reserva

from .models import DistribucionIngreso, MetricaSostenibilidad, Resena


class ResenaSerializer(serializers.ModelSerializer):
    reserva = serializers.PrimaryKeyRelatedField(queryset=Reserva.objects.all())
    calificacion = serializers.IntegerField(min_value=1, max_value=5)
    comentario = serializers.CharField(max_length=500, required=False, allow_blank=True)
    turista = serializers.SerializerMethodField()
    experiencia = serializers.SerializerMethodField()
    hospedaje = serializers.SerializerMethodField()

    class Meta:
        model = Resena
        fields = ['id', 'reserva', 'turista', 'experiencia', 'hospedaje', 'calificacion', 'comentario',
                  'fecha_creacion']
        read_only_fields = ['fecha_creacion']

    def get_turista(self, obj):
        return obj.reserva.turista_id

    def get_experiencia(self, obj):
        return obj.reserva.salida.experiencia_id if obj.reserva.salida_id else None

    def get_hospedaje(self, obj):
        return obj.reserva.hospedaje_id

    def validate_reserva(self, value):
        if self.instance:       # al editar, la reserva de una reseña no se puede cambiar
            if value != self.instance.reserva:
                raise serializers.ValidationError('No se puede cambiar la reserva de una reseña.')
        elif value.estado != 'COMPLETADA':
            raise serializers.ValidationError('Solo se pueden reseñar reservas completadas.')
        return value


class MetricaSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetricaSostenibilidad
        fields = ['id', 'experiencia', 'tipo', 'valor', 'fecha', 'notas']

    def validate_valor(self, value):
        if value <= 0:
            raise serializers.ValidationError('El valor de la métrica debe ser mayor que cero.')
        return value

    def validate_fecha(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError('La fecha de la métrica no puede estar en el futuro.')
        return value

    def validate_experiencia(self, value):
        if self.instance and value != self.instance.experiencia:
            raise serializers.ValidationError('No se puede cambiar la experiencia de una métrica.')
        return value


class DistribucionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DistribucionIngreso
        fields = ['id', 'reserva', 'monto_total', 'porcentaje_comunidad', 'monto_comunidad',
                  'monto_asociacion', 'fecha']
