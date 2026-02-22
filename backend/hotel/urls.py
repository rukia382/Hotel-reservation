from django.urls import path
from rest_framework.routers import DefaultRouter

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

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/logout/", LogoutView.as_view(), name="logout"),
    path("auth/me/", MeView.as_view(), name="me"),
]

urlpatterns += router.urls
