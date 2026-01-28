import hashlib
import uuid

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from apps.tenants.models import ApiKey, Membership, Workspace


User = get_user_model()


class WorkspaceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="user", password="pass")
        self.other_user = User.objects.create_user(username="other", password="pass")

    def test_create_workspace_creates_membership(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/v1/tenants/workspaces/",
            {"name": "Acme"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        workspace_id = response.data["id"]
        membership = Membership.objects.get(workspace_id=workspace_id, user=self.user)
        self.assertEqual(membership.role, Membership.ROLE_ADMIN)

    def test_list_workspaces_only_member(self):
        workspace = Workspace.objects.create(name="Acme", created_by=self.user)
        other_workspace = Workspace.objects.create(name="Other", created_by=self.other_user)
        Membership.objects.create(workspace=workspace, user=self.user, role=Membership.ROLE_ADMIN)
        Membership.objects.create(
            workspace=other_workspace,
            user=self.other_user,
            role=Membership.ROLE_ADMIN,
        )

        self.client.force_authenticate(self.user)
        response = self.client.get("/api/v1/tenants/workspaces/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        workspace_ids = {item["id"] for item in response.data}
        self.assertIn(str(workspace.id), workspace_ids)
        self.assertNotIn(str(other_workspace.id), workspace_ids)


class WorkspaceHeaderTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="user", password="pass")
        self.other_user = User.objects.create_user(username="other", password="pass")
        self.workspace = Workspace.objects.create(name="Acme", created_by=self.user)
        Membership.objects.create(
            workspace=self.workspace,
            user=self.user,
            role=Membership.ROLE_ADMIN,
        )

    def test_memberships_requires_header(self):
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/v1/tenants/memberships/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_memberships_invalid_header_404(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(
            "/api/v1/tenants/memberships/",
            HTTP_X_WORKSPACE_ID=str(uuid.uuid4()),
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_memberships_forbidden_when_not_member(self):
        self.client.force_authenticate(self.other_user)
        response = self.client.get(
            "/api/v1/tenants/memberships/",
            HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_memberships_list_for_member(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(
            "/api/v1/tenants/memberships/",
            HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)


class ApiKeyTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="user", password="pass")
        self.workspace = Workspace.objects.create(name="Acme", created_by=self.user)
        Membership.objects.create(
            workspace=self.workspace,
            user=self.user,
            role=Membership.ROLE_ADMIN,
        )

    def test_api_key_create_returns_secret_once(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/v1/tenants/api-keys/",
            {"name": "Primary"},
            format="json",
            HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("secret", response.data)
        secret = response.data["secret"]

        api_key = ApiKey.objects.get(id=response.data["id"])
        self.assertEqual(api_key.key_hash, hashlib.sha256(secret.encode("utf-8")).hexdigest())

        list_response = self.client.get(
            "/api/v1/tenants/api-keys/",
            HTTP_X_WORKSPACE_ID=str(self.workspace.id),
        )
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertNotIn("secret", list_response.data[0])
