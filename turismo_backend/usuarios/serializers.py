from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Perfil


class UsuarioSerializer(serializers.ModelSerializer):
    rol = serializers.ChoiceField(choices=Perfil.ROLES, source='perfil.rol', required=False)
    telefono = serializers.CharField(source='perfil.telefono', required=False, allow_blank=True, max_length=20)
    pais = serializers.CharField(source='perfil.pais', required=False, allow_blank=True, max_length=60)
    password = serializers.CharField(write_only=True, min_length=8, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'password', 'rol', 'telefono', 'pais', 'is_active']

    def validate_email(self, value):
        existe = User.objects.filter(email__iexact=value)
        if self.instance:
            existe = existe.exclude(pk=self.instance.pk)
        if value and existe.exists():
            raise serializers.ValidationError('Ya existe un usuario con ese correo.')
        return value

    def validate(self, data):
        if self.instance is None and 'password' not in data:
            raise serializers.ValidationError({'password': 'La contraseña es obligatoria.'})
        return data

    def create(self, validated_data):
        perfil = validated_data.pop('perfil', {})
        password = validated_data.pop('password')
        user = User.objects.create_user(password=password, **validated_data)
        Perfil.objects.create(user=user, **perfil)
        return user

    def update(self, instance, validated_data):
        perfil = validated_data.pop('perfil', {})
        password = validated_data.pop('password', None)
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        if password:
            instance.set_password(password)
        instance.save()
        if perfil:
            obj, _ = Perfil.objects.get_or_create(user=instance)
            for campo, valor in perfil.items():
                setattr(obj, campo, valor)
            obj.save()
        return instance


class RegistroSerializer(serializers.Serializer):
    """Registro publico: siempre crea un TURISTA."""
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    telefono = serializers.CharField(max_length=20, required=False, allow_blank=True)
    pais = serializers.CharField(max_length=60, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Ese nombre de usuario ya existe.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe un usuario con ese correo.')
        return value

    def create(self, validated_data):
        telefono = validated_data.pop('telefono', '')
        pais = validated_data.pop('pais', '')
        user = User.objects.create_user(**validated_data)
        Perfil.objects.create(user=user, rol='TURISTA', telefono=telefono, pais=pais)
        return user
