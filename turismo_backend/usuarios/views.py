from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import ProtectedError, Q
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from turismo_backend.utilidades import ADMIN, ordenar, paginar, prohibido, rol_de

from .serializers import RegistroSerializer, UsuarioSerializer


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def registro_api(request):
    serializer = RegistroSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(UsuarioSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def login_api(request):
    user = authenticate(username=request.data.get('username'), password=request.data.get('password'))
    if user is None:
        return Response({'detail': 'Credenciales inválidas.'}, status=status.HTTP_400_BAD_REQUEST)
    token, _ = Token.objects.get_or_create(user=user)
    return Response({'token': token.key, 'username': user.username, 'rol': rol_de(user)})


@api_view(['GET'])
def me_api(request):
    return Response(UsuarioSerializer(request.user).data)


@api_view(['GET', 'POST'])
def usuarios_api(request):
    if rol_de(request.user) != ADMIN:
        return prohibido()

    if request.method == 'GET':
        usuarios = User.objects.select_related('perfil').order_by('id')
        p = request.query_params
        if p.get('rol'):
            usuarios = usuarios.filter(perfil__rol=p['rol'].upper())
        if p.get('is_active') in ('true', 'false'):
            usuarios = usuarios.filter(is_active=p['is_active'] == 'true')
        if p.get('search'):
            texto = p['search']
            usuarios = usuarios.filter(Q(username__icontains=texto) | Q(email__icontains=texto) |
                                       Q(first_name__icontains=texto) | Q(last_name__icontains=texto))
        usuarios = ordenar(usuarios, p.get('ordering'), ['username', 'date_joined'])
        return paginar(request, usuarios, UsuarioSerializer)

    serializer = UsuarioSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def usuario_detalle_api(request, id):
    if rol_de(request.user) != ADMIN:
        return prohibido()
    try:
        usuario = User.objects.select_related('perfil').get(id=id)
    except User.DoesNotExist:
        return Response({'error': 'Usuario no encontrado.'}, status=404)

    if request.method == 'GET':
        return Response(UsuarioSerializer(usuario).data)

    if request.method in ['PUT', 'PATCH']:
        # El admin no puede quitarse su propio rol ni desactivarse
        if usuario == request.user and (request.data.get('rol', ADMIN) != ADMIN
                                        or request.data.get('is_active') in (False, 'false', 'False')):
            return Response({'detail': 'No puede quitarse el rol de administrador ni desactivar su cuenta.'},
                            status=400)
        serializer = UsuarioSerializer(usuario, data=request.data, partial=request.method == 'PATCH')
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if usuario == request.user:
        return Response({'detail': 'No puede eliminar su propio usuario.'}, status=400)
    try:
        usuario.delete()
    except ProtectedError:
        return Response({'detail': 'No se puede eliminar: tiene registros relacionados.'}, status=409)
    return Response(status=status.HTTP_204_NO_CONTENT)
