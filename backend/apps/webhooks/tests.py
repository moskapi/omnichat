from django.urls import reverse
from rest_framework.test import APITestCase

from .models import WebhookEvent


class WebhookInboxTests(APITestCase):
    def test_post_creates_event(self):
        url = reverse("webhooks-inbox")
        payload = {"provider": "acme", "payload": {"foo": "bar"}}

        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(WebhookEvent.objects.count(), 1)
        self.assertEqual(response.json()["idempotent"], False)

    def test_post_idempotency(self):
        url = reverse("webhooks-inbox")
        payload = {
            "provider": "acme",
            "payload": {"foo": "bar"},
            "idempotency_key": "acme:123",
        }

        r1 = self.client.post(url, payload, format="json")
        r2 = self.client.post(url, payload, format="json")

        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(WebhookEvent.objects.count(), 1)
        self.assertEqual(r2.json()["idempotent"], True)
