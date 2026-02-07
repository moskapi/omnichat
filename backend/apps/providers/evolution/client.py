import requests
from django.conf import settings


class EvolutionClientError(RuntimeError):
    def __init__(self, message: str, *, status_code: int | None = None, data=None, text: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.data = data
        self.text = text


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
                f"Evolution error {r.status_code} on {method} {path} | body={r.text[:500]}",
                status_code=r.status_code,
                data=data,
                text=r.text,
            )

        return data if data is not None else {"_raw": r.text}

    # ---------- INSTANCES ----------

    def create_instance(self, instance_name: str, *, integration: str = "WHATSAPP-BAILEYS"):
        return self._request(
            "POST",
            "/instance/create",
            json={
                "instanceName": instance_name,
                "qrcode": True,
                "integration": integration,  # <- obrigatório
            },
        )

    def get_status(self, instance_name: str):
        return self._request("GET", f"/instance/connectionState/{instance_name}")

    def logout_instance(self, instance_name: str):
        """
        Logout / disconnect (dependendo da Evolution, isso derruba a sessão).
        POST /instance/logout/{instance}
        """
        return self._request("POST", f"/instance/logout/{instance_name}")

    def delete_instance(self, instance_name: str):
        """
        Remove a instância por completo.
        DELETE /instance/delete/{instance}
        """
        return self._request("DELETE", f"/instance/delete/{instance_name}")

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

    def set_settings(self, instance_name: str, settings_payload: dict):
        # Endpoint comum da Evolution para settings:
        # POST /settings/set/{instance}
        return self._request("POST", f"/settings/set/{instance_name}", json=settings_payload)

        # ---------- WEBHOOK ----------
    def set_webhook(self, instance_name: str, *, url: str, events: list[str], enabled: bool = True):
        """
        Configura webhook para a instância.
        Algumas versões da Evolution usam /webhook/instance (v2) e outras /webhook/set/{instance}.
        Tentamos os dois para ser compatível.
        """

        payload_v2 = {
            "enabled": enabled,
            "url": url,
            "events": events,
            "instance": instance_name,
            # opções que algumas builds aceitam/ignoram
            "webhook_by_events": False,
            "webhook_base64": False,
        }

        # Tentativa 1 (comum em v2)
        try:
            return self._request("POST", "/webhook/instance", json=payload_v2, timeout=20)
        except EvolutionClientError:
            pass

        # Tentativa 2 (comum em outras builds)
        payload_v1 = {
            "enabled": enabled,
            "url": url,
            "events": events,
        }
        return self._request("POST", f"/webhook/set/{instance_name}", json=payload_v1, timeout=20)
