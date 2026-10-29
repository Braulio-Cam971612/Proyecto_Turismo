from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from turismo_backend.utilidades import GUIA, rol_de

from .models import Experiencia, Salida


class ExperienciaSerializer(serializers.ModelSerializer):
    guia_username = serializers.CharField(source='guia.username', read_only=True)

    class Meta:
        model = Experiencia
        fields = ['id', 'nombre', 'descripcion', 'categoria', 'precio_persona', 'capacidad_maxima',
                  'duracion_horas', 'guia', 'guia_username', 'activo']

    def validate_precio_persona(self, value):
        if value <= 0:
            raise serializers.ValidationError('El precio por persona debe ser mayor que cero.')
        return value

    def validate_capacidad_maxima(self, value):
        if value < 1:
            raise serializers.ValidationError('La capacidad máxima debe ser al menos 1.')
        return value

    def validate_guia(self, value):
        if rol_de(value) != GUIA:
            raise serializers.ValidationError('El responsable debe tener rol Guía Local.')
        return value


class SalidaSerializer(serializers.ModelSerializer):
    experiencia_nombre = serializers.CharField(source='experiencia.nombre', read_only=True)
    cupos_disponibles = serializers.SerializerMethodField()

    class Meta:
        model = Salida
        fields = ['id', 'experiencia', 'experiencia_nombre', 'fecha_hora', 'activo', 'cupos_disponibles']

    def get_cupos_disponibles(self, obj):
        ocupados = obj.reservas.exclude(estado='CANCELADA').aggregate(t=Sum('personas'))['t'] or 0
        return max(obj.experiencia.capacidad_maxima - ocupados, 0)

    def validate_fecha_hora(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError('La salida debe programarse en el futuro.')
        return value

    def validate(self, data):
        experiencia = data.get('experiencia')
        if self.instance and experiencia and experiencia != self.instance.experiencia:
            raise serializers.ValidationError({'experiencia': 'No se puede cambiar la experiencia de una salida.'})
        if self.instance is None and experiencia and not experiencia.activo:
            raise serializers.ValidationError({'experiencia': 'No se pueden crear salidas de una experiencia inactiva.'})
        return data
