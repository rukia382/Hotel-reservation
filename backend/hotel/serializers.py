from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Booking, Customer, Room, Transaction


class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = "__all__"


class BookingHistorySerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source="room.room_number", read_only=True)

    class Meta:
        model = Booking
        fields = ["id", "room", "room_number", "check_in", "check_out", "created_at"]


class CustomerSerializer(serializers.ModelSerializer):
    booking_history = BookingHistorySerializer(source="bookings", many=True, read_only=True)
    total_bookings = serializers.IntegerField(source="bookings.count", read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = Customer
        fields = ["id", "user_id", "name", "phone", "national_id", "total_bookings", "booking_history"]


class BookingSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    customer_name = serializers.CharField(source="customer.name", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "room",
            "room_number",
            "customer",
            "customer_name",
            "check_in",
            "check_out",
            "created_at",
        ]

    def validate(self, attrs):
        check_in = attrs.get("check_in")
        check_out = attrs.get("check_out")
        room = attrs.get("room")

        if check_in and check_out and check_in >= check_out:
            raise serializers.ValidationError("Check-out date must be later than check-in date.")

        if room and check_in and check_out:
            overlapping_bookings = Booking.objects.filter(
                room=room,
                check_in__lt=check_out,
                check_out__gt=check_in,
            )

            if self.instance is not None:
                overlapping_bookings = overlapping_bookings.exclude(id=self.instance.id)

            if overlapping_bookings.exists():
                raise serializers.ValidationError("Room is already booked for the selected date range.")

        return attrs


class TransactionSerializer(serializers.ModelSerializer):
    booking_id = serializers.IntegerField(source="booking.id", read_only=True)

    class Meta:
        model = Transaction
        fields = ["id", "booking_id", "transaction_type", "amount", "note", "created_at"]


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=6)
    name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=20)
    national_id = serializers.CharField(max_length=50)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already exists.")
        return value

    def validate_national_id(self, value):
        if Customer.objects.filter(national_id=value).exists():
            raise serializers.ValidationError("National ID already exists.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data["username"],
            password=validated_data["password"],
            is_staff=False,
            is_superuser=False,
        )
        customer = Customer.objects.create(
            user=user,
            name=validated_data["name"],
            phone=validated_data["phone"],
            national_id=validated_data["national_id"],
        )
        return user, customer


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        user = authenticate(username=attrs.get("username"), password=attrs.get("password"))
        if not user:
            raise serializers.ValidationError("Invalid username or password.")
        attrs["user"] = user
        return attrs
