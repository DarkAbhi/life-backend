from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import GymVisit, Meditation, Investment, Sport, Transaction, Vehicle, PhysiqueDetail, CreditCard

# Register your models here.


@admin.register(GymVisit)
class GymVisitAdminClass(ModelAdmin):
    pass


@admin.register(Meditation)
class MeditationAdminClass(ModelAdmin):
    pass


@admin.register(Investment)
class InvestmentAdminClass(ModelAdmin):
    pass


@admin.register(Sport)
class SportAdminClass(ModelAdmin):
    pass


@admin.register(Transaction)
class TransactionAdminClass(ModelAdmin):
    pass


@admin.register(Vehicle)
class VehicleAdminClass(ModelAdmin):
    pass


@admin.register(PhysiqueDetail)
class PhysiqueDetailAdminClass(ModelAdmin):
    pass


@admin.register(CreditCard)
class CreditCardAdminClass(ModelAdmin):
    pass
