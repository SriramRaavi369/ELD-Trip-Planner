from django.urls import path
from . import views

urlpatterns = [
    path('trip-plan/', views.trip_plan, name='trip-plan'),
    path('autocomplete/', views.autocomplete, name='autocomplete'),
]
