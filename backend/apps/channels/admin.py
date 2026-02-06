from django.contrib import admin

from .models import Channel, WorkspaceProvider

admin.site.register(WorkspaceProvider)
admin.site.register(Channel)
