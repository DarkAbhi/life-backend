from django.urls import path

from . import views

urlpatterns = [
    path("workout/add-workout/", views.add_workout_for_day),
    path("meditation/add-meditation/", views.add_meditation_for_day),
    path("investment/update-investment/", views.update_investment),
    path("sport/add-sport/", views.add_sport_for_day),
    path('transaction/', views.TransactionsApiView.as_view()),
    path('vehicle/', views.VehiclesApiView.as_view())
]
