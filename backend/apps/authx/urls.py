from django.urls import path
from rest_framework_simplejwt.views import (TokenObtainPairView,
                                            TokenRefreshView)

from .views import (EmailTokenObtainPairView, PasswordResetConfirmView,
                    PasswordResetRequestView, SignupView)

urlpatterns = [
    path("token/", EmailTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    path("signup/", SignupView.as_view(), name="signup"),
    path("password-reset/", PasswordResetRequestView.as_view(),
         name="password_reset"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(),
         name="password_reset_confirm"),
]
