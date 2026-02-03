import requests
from django.conf import settings


class EvolutionClientError(RuntimeError):
    pass


class EvolutionClient:
    def __init__(self, base_url=None, api_key=None):
        self.base_url = (base_url or settings.EVOLUTION_BASE_URL).rstrip("/")
        self.api_key = api_key or settings.EVOLUTION_API_KEY

    def _headers(self):
        return {
            "Content-Type": "application/json",
            "apikey": self.api_key,
        }

    def _request(self, method: str, path: str, *, json=None, timeout=20):
        url = f"{self.base_url}{path}"
        r = requests.request(
            method,
            url,
            json=json,
            headers=self._headers(),
            timeout=timeout,
        )

        try:
            data = r.json()
        except Exception:
            data = None

        if not r.ok:
            raise EvolutionClientError(
                f"Evolution error {r.status_code} on {method} {path} | body={r.text[:500]}"
            )

        return data if data is not None else {"_raw": r.text}

    # ---------- INSTANCES ----------

    def create_instance(self, instance_name: str):
        return self._request(
            "POST",
            "/instance/create",
            json={"instanceName": instance_name, "qrcode": True},
        )

    def get_status(self, instance_name: str):
        return self._request("GET", f"/instance/connectionState/{instance_name}")

    # ---------- PAIRING CODE (ONLY) ----------

    def connect_pairing_code(self, instance_name: str, *, number: str):
        """
        Pairing Code:
        GET /instance/connect/{instance}?number=5516999999999
        """
        return self._request(
            "GET",
            f"/instance/connect/{instance_name}?number={number}",
        )
