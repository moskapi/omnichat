from rest_framework.routers import DefaultRouter

from apps.tenants import views

router = DefaultRouter()
router.register("workspaces", views.WorkspaceViewSet, basename="workspace")
router.register("memberships", views.MembershipViewSet, basename="membership")
router.register("api-keys", views.ApiKeyViewSet, basename="api-key")

urlpatterns = router.urls
