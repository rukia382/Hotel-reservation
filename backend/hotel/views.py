from datetime import date
from decimal import Decimal
import re
from uuid import uuid4

from django.contrib.auth import logout
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date
from rest_framework import permissions, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking, Customer, Room, Transaction
from .serializers import (
    BookingSerializer,
    CustomerSerializer,
    LoginSerializer,
    RegisterSerializer,
    RoomSerializer,
    TransactionSerializer,
)


def _escape_pdf_text(text):
    return str(text).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _build_receipt_pdf(receipt):
    # Colors follow frontend theme tokens in `index.css` and `App.css`.
    bg_color = "0.957 0.965 0.984"  # --bg
    surface_color = "1 1 1"  # --surface
    border_color = "0.847 0.875 0.922"  # --border
    text_color = "0.11 0.141 0.192"  # --text
    muted_color = "0.404 0.451 0.529"  # --muted
    brand_dark = "0.02 0.212 0.502"  # app-header dark
    brand_color = "0 0.337 0.839"  # --brand
    header_soft = "0.867 0.914 1"  # app-header subtitle tone

    commands = []

    # Page background
    commands.append(f"{bg_color} rg")
    commands.append("0 0 612 792 re f")

    # Header banner (two-tone to mimic app header gradient feel)
    commands.append(f"{brand_dark} rg")
    commands.append("30 708 552 54 re f")
    commands.append(f"{brand_color} rg")
    commands.append("30 762 552 30 re f")

    # Main cards
    for x, y, w, h in [(30, 472, 552, 220), (30, 250, 552, 205)]:
        commands.append(f"{surface_color} rg")
        commands.append(f"{x} {y} {w} {h} re f")
        commands.append(f"{border_color} RG")
        commands.append("1 w")
        commands.append(f"{x} {y} {w} {h} re S")

    def add_text(font, size, color, x, y, text):
        commands.append("BT")
        commands.append(f"/{font} {size} Tf")
        commands.append(f"{color} rg")
        commands.append(f"1 0 0 1 {x} {y} Tm")
        commands.append(f"({_escape_pdf_text(text)}) Tj")
        commands.append("ET")

    # Header text
    add_text("F2", 21, "1 1 1", 48, 774, "Hotel Reservation Receipt")
    add_text("F1", 11, header_soft, 48, 748, "Payment confirmation for your room booking")
    add_text("F1", 10, header_soft, 430, 748, f"Receipt #{receipt['booking_id']}")

    # Section: booking details
    add_text("F2", 13, brand_color, 48, 678, "Booking Details")
    detail_rows = [
        ("Customer", receipt["customer"]),
        ("Room", receipt["room"]),
        ("Check-in", receipt["check_in"]),
        ("Check-out", receipt["check_out"]),
        ("Days", str(receipt["days"])),
        ("Issued", receipt["issued"]),
    ]
    y = 652
    for label, value in detail_rows:
        add_text("F2", 10, muted_color, 48, y, f"{label}:")
        add_text("F1", 11, text_color, 170, y, str(value))
        y -= 26

    # Section: payment summary
    add_text("F2", 13, brand_color, 48, 438, "Payment Summary")
    payment_rows = [
        ("Rate per day", f"${receipt['rate_per_day']}"),
        ("Payment method", receipt["payment_method"]),
        ("Payment reference", receipt["payment_reference"]),
    ]
    y = 412
    for label, value in payment_rows:
        add_text("F2", 10, muted_color, 48, y, f"{label}:")
        add_text("F1", 11, text_color, 170, y, str(value))
        y -= 28

    # Highlighted total row
    commands.append(f"0.863 0.914 1 rg")
    commands.append("420 270 150 40 re f")
    commands.append(f"{border_color} RG")
    commands.append("1 w")
    commands.append("420 270 150 40 re S")
    add_text("F2", 10, muted_color, 434, 296, "TOTAL PAID")
    add_text("F2", 15, brand_dark, 434, 280, f"${receipt['total_paid']}")

    add_text("F1", 10, muted_color, 48, 225, "Thank you for booking with Hotel Reservation System.")
    add_text("F1", 9, muted_color, 48, 208, "Keep this receipt for your records.")

    stream = "\n".join(commands).encode("latin-1", errors="replace")

    objects = []
    objects.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    objects.append(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    objects.append(
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n"
    )
    objects.append(b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")
    objects.append(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n")
    objects.append(b"6 0 obj\n<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream\nendobj\n")

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj)

    xref_start = len(pdf)
    pdf.extend(f"xref\n0 {len(offsets)}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    pdf.extend(
        (
            f"trailer\n<< /Size {len(offsets)} /Root 1 0 R >>\n"
            f"startxref\n{xref_start}\n%%EOF\n"
        ).encode("ascii")
    )
    return bytes(pdf)


def _generate_payment_reference(method):
    prefix = "BT" if method == "bank_transfer" else "MM"
    return f"{prefix}-{date.today().strftime('%Y%m%d')}-{uuid4().hex[:8].upper()}"


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user, customer = serializer.save()

        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                "token": token.key,
                "role": "admin" if user.is_staff else "customer",
                "username": user.username,
                "customer_id": customer.id,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        token, _ = Token.objects.get_or_create(user=user)
        customer = getattr(user, "customer_profile", None)

        return Response(
            {
                "token": token.key,
                "role": "admin" if user.is_staff else "customer",
                "username": user.username,
                "customer_id": customer.id if customer else None,
            }
        )


class LogoutView(APIView):
    def post(self, request):
        request.user.auth_token.delete()
        logout(request)
        return Response({"detail": "Logged out."}, status=status.HTTP_200_OK)


class MeView(APIView):
    def get(self, request):
        customer = getattr(request.user, "customer_profile", None)
        return Response(
            {
                "username": request.user.username,
                "role": "admin" if request.user.is_staff else "customer",
                "customer_id": customer.id if customer else None,
            }
        )


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all().order_by("room_number")
    serializer_class = RoomSerializer
    permission_classes = [IsAdminOrReadOnly]

    @action(detail=False, methods=["get"], url_path="available")
    def available(self, request):
        check_in_raw = request.query_params.get("check_in")
        check_out_raw = request.query_params.get("check_out")

        if not check_in_raw or not check_out_raw:
            return Response(
                {"error": "check_in and check_out query params are required (YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        check_in = parse_date(check_in_raw)
        check_out = parse_date(check_out_raw)

        if not check_in or not check_out:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if check_in >= check_out:
            return Response(
                {"error": "check_out must be later than check_in."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        occupied_room_ids = Booking.objects.filter(
            check_in__lt=check_out,
            check_out__gt=check_in,
        ).values_list("room_id", flat=True)

        available_rooms = Room.objects.exclude(id__in=occupied_room_ids).order_by("room_number")
        return Response(RoomSerializer(available_rooms, many=True).data)


class CustomerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Customer.objects.all().order_by("name")
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAdminUser]


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.select_related("room", "customer").all()
    serializer_class = BookingSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.user.is_staff:
            return queryset

        customer = getattr(self.request.user, "customer_profile", None)
        if not customer:
            return queryset.none()

        return queryset.filter(customer=customer)

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        payment_method = str(payload.get("payment_method", "")).strip().lower()
        payment_reference = str(payload.get("payment_reference", "")).strip()
        payload.pop("payment_method", None)
        payload.pop("payment_reference", None)
        allowed_payment_methods = {"mobile_money", "bank_transfer"}

        if request.user.is_staff:
            customer_id = payload.get("customer")
        else:
            customer = getattr(request.user, "customer_profile", None)
            if not customer:
                return Response({"error": "Customer profile not found."}, status=status.HTTP_400_BAD_REQUEST)
            customer_id = customer.id
            payload["customer"] = customer.id

            if payment_method not in allowed_payment_methods:
                return Response(
                    {"error": "Payment method is required. Choose mobile_money or bank_transfer."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if not payment_reference:
                payment_reference = _generate_payment_reference(payment_method)

        if not customer_id:
            return Response({"error": "Customer is required."}, status=status.HTTP_400_BAD_REQUEST)

        customer_obj = get_object_or_404(Customer, id=customer_id)

        serializer = self.get_serializer(data=payload)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save(customer=customer_obj)

        stay_days = (booking.check_out - booking.check_in).days
        total_amount = Decimal(stay_days) * booking.room.price

        Transaction.objects.create(
            booking=booking,
            transaction_type=Transaction.Type.BOOKING,
            amount=total_amount,
            note=(
                f"Booked room {booking.room.room_number} for {booking.customer.name} "
                f"from {booking.check_in} to {booking.check_out}"
                + (
                    f" | payment: {payment_method} ({payment_reference})"
                    if payment_method and payment_reference
                    else ""
                )
            ),
        )

        room = booking.room
        room.is_available = not room.bookings.filter(check_out__gt=date.today()).exists()
        room.save(update_fields=["is_available"])

        headers = self.get_success_headers(serializer.data)
        response_data = dict(serializer.data)
        response_data["receipt_url"] = f"/api/bookings/{booking.id}/receipt/"
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()

        if not request.user.is_staff:
            customer = getattr(request.user, "customer_profile", None)
            if not customer or booking.customer_id != customer.id:
                return Response(status=status.HTTP_403_FORBIDDEN)

        room = booking.room

        stay_days = (booking.check_out - booking.check_in).days
        refund_amount = Decimal(stay_days) * booking.room.price

        Transaction.objects.create(
            booking=booking,
            transaction_type=Transaction.Type.CANCELLATION,
            amount=-refund_amount,
            note=(
                f"Cancelled room {booking.room.room_number} booking for {booking.customer.name} "
                f"({booking.check_in} to {booking.check_out})"
            ),
        )

        response = super().destroy(request, *args, **kwargs)

        room.is_available = not room.bookings.filter(check_out__gt=date.today()).exists()
        room.save(update_fields=["is_available"])

        return response

    @action(detail=True, methods=["get"], url_path="receipt")
    def receipt(self, request, pk=None):
        booking = self.get_object()
        stay_days = (booking.check_out - booking.check_in).days
        total_amount = Decimal(stay_days) * booking.room.price
        booking_transaction = booking.transactions.filter(transaction_type=Transaction.Type.BOOKING).first()

        payment_method = "N/A"
        payment_reference = "N/A"
        if booking_transaction and booking_transaction.note:
            match = re.search(r"payment:\s*([a-z_]+)\s*\((.+)\)\s*$", booking_transaction.note, flags=re.IGNORECASE)
            if match:
                payment_method = match.group(1).replace("_", " ").title()
                payment_reference = match.group(2)

        receipt = {
            "booking_id": booking.id,
            "customer": booking.customer.name,
            "room": f"{booking.room.room_number} ({booking.room.room_type})",
            "check_in": str(booking.check_in),
            "check_out": str(booking.check_out),
            "days": stay_days,
            "rate_per_day": booking.room.price,
            "total_paid": total_amount,
            "payment_method": payment_method,
            "payment_reference": payment_reference,
            "issued": booking.created_at.strftime("%Y-%m-%d %H:%M:%S"),
        }

        pdf_bytes = _build_receipt_pdf(receipt)
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="receipt-{booking.id}.pdf"'
        return response


class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAdminUser]
