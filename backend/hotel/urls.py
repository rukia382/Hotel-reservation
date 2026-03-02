from django.urls import path
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.routers import DefaultRouter
from rest_framework.reverse import reverse
from rest_framework.views import APIView

from .views import (
    BookingViewSet,
    CustomerViewSet,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
    RoomViewSet,
    TransactionViewSet,
)

router = DefaultRouter()
router.register(r"rooms", RoomViewSet)
router.register(r"customers", CustomerViewSet)
router.register(r"bookings", BookingViewSet)
router.register(r"transactions", TransactionViewSet)


class APIRootView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        return Response(
            {
                "auth-register": reverse("register", request=request),
                "auth-login": reverse("login", request=request),
                "auth-logout": reverse("logout", request=request),
                "auth-me": reverse("me", request=request),
                "rooms": reverse("room-list", request=request),
                "customers": reverse("customer-list", request=request),
                "bookings": reverse("booking-list", request=request),
                "transactions": reverse("transaction-list", request=request),
            }
        )


urlpatterns = [
    path("", APIRootView.as_view(), name="api-root"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", MeView.as_view(), name="me"),
]

urlpatterns += router.urls
