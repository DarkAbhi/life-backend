from django.db import models
from django.utils import timezone


# Create your models here.


class Meditation(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class GymVisit(models.Model):
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)


class Trip(models.Model):
    name = models.CharField(max_length=64)
    start_date = models.DateField()
    end_date = models.DateField()
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class PhysiqueDetail(models.Model):
    height = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True, help_text='Height in centimeters')
    weight = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True, help_text='Weight in kilograms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        # Format the created_at datetime to the desired format
        formatted_date = timezone.localtime(
            self.created_at).strftime('%d-%m-%Y at %I:%M %p')
        return f"Height and weight on {formatted_date}"


class CreditCard(models.Model):
    name = models.CharField(max_length=64)
    link = models.URLField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Investment(models.Model):
    total_in_stocks = models.DecimalField(
        max_digits=14, decimal_places=2, default=None, null=True)
    total_in_crypto = models.DecimalField(
        max_digits=14, decimal_places=2, default=None, null=True)
    total_in_mutual_funds = models.DecimalField(
        max_digits=14, decimal_places=2, default=None, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Sport(models.Model):
    SPORT_NAMES = (
        ("cricket", "Cricket"),
        ("football", "Football"),
        ("badminton", "Badminton")
    )
    name = models.CharField(max_length=10, choices=SPORT_NAMES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Vehicle(models.Model):
    name = models.CharField(max_length=48)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Transaction(models.Model):
    TRANSACTION_CATEGORIES = (
        (1, "Entertainment"),
        (2, "Shopping"),
        (3, "Transport"),
        (4, "Fuel"),
        (5, "Education"),
        (6, "Bills & Utilites"),
        (7, "Health & Wellness"),
        (8, "Groceries"),
        (9, "Trips"),
        (10, "Gadgets"),
        (11, "Fitness"),
        (12, "Food"),
    )
    name = models.CharField(max_length=64)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    description = models.TextField(null=True)
    vehicle = models.ForeignKey(
        Vehicle, on_delete=models.CASCADE, null=True, default=None)
    category = models.IntegerField(choices=TRANSACTION_CATEGORIES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
