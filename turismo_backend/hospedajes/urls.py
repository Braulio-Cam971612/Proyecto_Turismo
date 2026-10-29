from django.urls import path

from . import views

urlpatterns = [
    path('hospedajes/', views.hospedajes_api, name='hospedajes_api'),
    path('hospedajes/disponibles/', views.hospedajes_disponibles_api, name='hospedajes_disponibles_api'),
    path('hospedajes/<int:id>/', views.hospedaje_detalle_api, name='hospedaje_detalle_api'),
    path('servicios/', views.servicios_api, name='servicios_api'),
    path('servicios/<int:id>/', views.servicio_detalle_api, name='servicio_detalle_api'),
]
