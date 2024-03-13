from django.contrib import admin
from .models import GymVisit, Meditation, Investment, Sport, Transaction, Vehicle, PhysiqueDetail

# Register your models here.
admin.site.register(GymVisit)
admin.site.register(Meditation)
admin.site.register(Investment)
admin.site.register(Sport)
admin.site.register(Transaction)
admin.site.register(Vehicle)
admin.site.register(PhysiqueDetail)
