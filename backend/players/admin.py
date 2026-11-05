from django.contrib import admin

from .models import Player


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ('code', 'created_at', 'updated_at')
    search_fields = ('code',)
