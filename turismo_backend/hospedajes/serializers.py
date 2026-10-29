from rest_framework import serializers

from turismo_backend.utilidades import ANFITRION, rol_de

from .models import Hospedaje, Servicio


class ServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servicio
        fields = ['id', 'nombre']


class HospedajeSerializer(serializers.ModelSerializer):
    anfitrion_username = serializers.CharField(source='anfitrion.username', read_only=True)
    servicios = serializers.PrimaryKeyRelatedField(many=True, queryset=Servicio.objects.all(), required=False)

    class Meta:
        model = Hospedaje
        fields = ['id', 'nombre', 'descripcion', 'ubicacion', 'anfitrion', 'anfitrion_username',
                  'precio_noche', 'capacidad_personas', 'num_habitaciones', 'servicios', 'activo']

    def validate_precio_noche(self, value):
        if value <= 0:
            raise serializers.ValidationError('El precio por noche debe ser mayor que cero.')
        return value

    def validate_capacidad_personas(self, value):
        if value < 1:
            raise serializers.ValidationError('La capacidad debe ser al menos 1 persona.')
        return value

    def validate_num_habitaciones(self, value):
        if value < 1:
            raise serializers.ValidationError('Debe tener al menos 1 habitación.')
        return value

    def validate_anfitrion(self, value):
        if rol_de(value) != ANFITRION:
            raise serializers.ValidationError('El responsable debe tener rol Anfitrión de Hospedaje.')
        return value
