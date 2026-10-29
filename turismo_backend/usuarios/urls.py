from django.urls import path

from . import views

urlpatterns = [
    path('auth/registro/', views.registro_api, name='registro'),
    path('auth/login/', views.login_api, name='login'),
    path('auth/me/', views.me_api, name='me'),
    path('usuarios/', views.usuarios_api, name='usuarios_api'),
    path('usuarios/<int:id>/', views.usuario_detalle_api, name='usuario_detalle_api'),
]
