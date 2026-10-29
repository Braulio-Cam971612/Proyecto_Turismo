from django.contrib import admin

from .models import DistribucionIngreso, MetricaSostenibilidad, Resena

admin.site.register(Resena)
admin.site.register(MetricaSostenibilidad)
admin.site.register(DistribucionIngreso)

# Register your models here.
