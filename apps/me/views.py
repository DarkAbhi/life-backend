from datetime import datetime, timezone

from rest_framework import status, generics
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import GymVisit, Meditation, Investment, Sport, Transaction, Vehicle, PhysiqueDetail


# Create your views here.


@api_view(["POST"])
def add_workout_for_day(request):
    current_date = datetime.now(timezone.utc).date()
    if GymVisit.objects.filter(created_at__date=current_date).exists():
        return Response(data={"error": "Gym entry already marked for today."}, status=status.HTTP_400_BAD_REQUEST)
    else:
        GymVisit.objects.create()
        return Response(data={"message": "success"}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def add_meditation_for_day(request):
    current_date = datetime.now(timezone.utc).date()
    if Meditation.objects.filter(created_at__date=current_date).exists():
        return Response(data={"error": "You have already meditated today."}, status=status.HTTP_400_BAD_REQUEST)
    else:
        Meditation.objects.create()
        return Response(data={"message": "success"}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def add_sport_for_day(request):
    if request.data.get("sport") in ["cricket", "football", "badminton"]:
        Sport.objects.create(name=request.data.get("sport"))
        return Response(data={"message": "success"}, status=status.HTTP_201_CREATED)
    else:
        return Response(data={"error": "This sport is not available yet."}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
def update_investment(request):
    if Investment.objects.exists():
        investment_obj = Investment.objects.all().first()
        if request.data.get("stocks"):
            investment_obj.total_in_stocks = request.data.get("stocks")
        if request.data.get("mutual_funds"):
            investment_obj.total_in_mutual_funds = request.data.get(
                "mutual_funds")
        if request.data.get("crypto"):
            investment_obj.total_in_crypto = request.data.get("crypto")
        investment_obj.save()
        return Response(data={"message": "success"}, status=status.HTTP_200_OK)
    else:
        Investment.objects.create(total_in_stocks=request.data.get("stocks", None),
                                  total_in_mutual_funds=request.data.get(
                                      "mutual_funds", None), total_in_crypto=request.data.get("crypto", None))
        return Response(data={"message": "success"}, status=status.HTTP_201_CREATED)


@api_view(["POST"])
def update_height_weight(request):
    # If height is not provided, try to get the last known height
    if request.data.get("height") is None:
        last_measurement = PhysiqueDetail.objects.all().order_by('-created_at').first()
        if last_measurement:
            height = last_measurement.height
        else:
            height = None
    else:
        height = request.data.get("height")

    if request.data.get("weight") is None:
        last_measurement = PhysiqueDetail.objects.all().order_by('-created_at').first()
        if last_measurement:
            weight = last_measurement.weight
        else:
            weight = None
    else:
        weight = request.data.get("weight")

    # Create the new physique details
    PhysiqueDetail.objects.create(
        weight=weight,  # This could be None if no previous measurement exists
        height=height  # This could be None if no previous measurement exists
    )
    return Response(data={"message": "success"}, status=status.HTTP_201_CREATED)


class TransactionsApiView(generics.ListCreateAPIView):
    queryset = Transaction.objects.all()

    def create(self, request, *args, **kwargs):
        if 'vehicle' in request.POST:
            if request.data.get("category") == "4":
                transaction = Transaction.objects.create(name=request.data.get("name"),
                                                         amount=request.data.get(
                                                             "amount"),
                                                         date=request.data.get(
                                                             "date"),
                                                         category=request.data.get(
                                                             "category"),
                                                         vehicle=Vehicle.objects.get(
                                                             name=request.data.get("vehicle"))
                                                         )
            else:
                return Response({"error": "Invalid input."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            transaction = Transaction.objects.create(name=request.data.get("name"),
                                                     amount=request.data.get(
                                                         "amount"),
                                                     date=request.data.get(
                                                         "date"),
                                                     category=request.data.get(
                                                         "category")
                                                     )
        return Response({
            "id": transaction.id,
            "name": transaction.name,
            "amount": transaction.amount,
            "category": transaction.get_category_display()
        }, status=status.HTTP_201_CREATED)

    def list(self, request, *args, **kwargs):
        recent_transactions = self.queryset.order_by("-created_at")[:10]
        transactions = []
        for transaction in recent_transactions:
            transactions.append(
                {
                    "id": transaction.id,
                    "name": transaction.name,
                    "amount": transaction.amount,
                    "category": transaction.get_category_display()
                }
            )
        return Response(transactions, status=status.HTTP_200_OK)


class VehiclesApiView(generics.ListAPIView):
    queryset = Vehicle.objects.all()

    def list(self, request, *args, **kwargs):
        vehicles = []
        for vehicle in self.queryset.all():
            vehicles.append(
                {
                    "id": vehicle.id,
                    "name": vehicle.name
                }
            )
        return Response(vehicles, status=status.HTTP_200_OK)
