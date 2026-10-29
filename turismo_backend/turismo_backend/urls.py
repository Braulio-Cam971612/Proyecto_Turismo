from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('usuarios.urls')),
    path('api/', include('experiencias.urls')),
    path('api/', include('hospedajes.urls')),
    path('api/', include('reservas.urls')),
    path('api/', include('resenas.urls')),
]
