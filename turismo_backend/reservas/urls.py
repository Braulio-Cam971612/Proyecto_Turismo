from django.urls import path

from . import views

urlpatterns = [
    path('reservas/', views.reservas_api, name='reservas_api'),
    path('reservas/<int:id>/', views.reserva_detalle_api, name='reserva_detalle_api'),
    path('reservas/<int:id>/pagar/', views.reserva_pagar_api, name='reserva_pagar_api'),
    path('reservas/<int:id>/cancelar/', views.reserva_cancelar_api, name='reserva_cancelar_api'),
    path('reservas/<int:id>/completar/', views.reserva_completar_api, name='reserva_completar_api'),
]
