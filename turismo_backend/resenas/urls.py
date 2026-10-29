from django.urls import path

from . import views

urlpatterns = [
    path('resenas/', views.resenas_api, name='resenas_api'),
    path('resenas/<int:id>/', views.resena_detalle_api, name='resena_detalle_api'),
    path('metricas/', views.metricas_api, name='metricas_api'),
    path('metricas/<int:id>/', views.metrica_detalle_api, name='metrica_detalle_api'),
    path('distribuciones/', views.distribuciones_api, name='distribuciones_api'),
    path('distribuciones/<int:id>/', views.distribucion_detalle_api, name='distribucion_detalle_api'),
    path('reportes/experiencias-top/', views.experiencias_top, name='experiencias_top'),
    path('reportes/ingresos-por-experiencia/', views.ingresos_por_experiencia, name='ingresos_por_experiencia'),
    path('reportes/ocupacion-salidas/', views.ocupacion_salidas, name='ocupacion_salidas'),
    path('reportes/hospedajes-demanda/', views.hospedajes_demanda, name='hospedajes_demanda'),
    path('reportes/resumen-sostenibilidad/', views.resumen_sostenibilidad, name='resumen_sostenibilidad'),
]
