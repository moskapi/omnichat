from django.urls import path

from .views import WebhookInboxView

urlpatterns = [
    path("inbox/", WebhookInboxView.as_view(), name="webhooks-inbox"),
]
