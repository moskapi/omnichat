import requests
from django.conf import settings


class EvolutionClient:
    def __init__(self):
        self.base_url = settings.EVOLUTION_BASE_URL.rstrip("/")
        self.api_key = settings.EVOLUTION_API_KEY

    def _headers(self):
        return {
            "Content-Type": "application/json",
            "apikey": self.api_key,
        }

    def create_instance(self, instance_name: str):
        """
        Cria uma instância no Evolution
        """
        url = f"{self.base_url}/instance/create"
        payload = {
            "instanceName": instance_name,
            "qrcode": True,
        }

        r = requests.post(url, json=payload, headers=self._headers(), timeout=20)
        r.raise_for_status()
        return r.json()

    def get_qr(self, instance_name: str):
        """
        Retorna QR code (base64) se ainda não conectado
        """
        url = f"{self.base_url}/instance/connect/{instance_name}"
        r = requests.get(url, headers=self._headers(), timeout=20)
        r.raise_for_status()
        return r.json()

    def get_status(self, instance_name: str):
        url = f"{self.base_url}/instance/connectionState/{instance_name}"
        r = requests.get(url, headers=self._headers(), timeout=20)
        r.raise_for_status()
        return r.json()
