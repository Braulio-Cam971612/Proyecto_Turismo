from django.urls import path

from . import views

urlpatterns = [
    path('experiencias/', views.experiencias_api, name='experiencias_api'),
    path('experiencias/<int:id>/', views.experiencia_detalle_api, name='experiencia_detalle_api'),
    path('salidas/', views.salidas_api, name='salidas_api'),
    path('salidas/<int:id>/', views.salida_detalle_api, name='salida_detalle_api'),
]
