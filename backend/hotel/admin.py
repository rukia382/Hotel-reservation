from django.contrib import admin

from .models import Booking, Customer, Room, Transaction

admin.site.register(Room)
admin.site.register(Customer)
admin.site.register(Booking)
admin.site.register(Transaction)
