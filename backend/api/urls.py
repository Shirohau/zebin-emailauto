from django.urls import path

from . import views

urlpatterns = [
    path("csrf/", views.csrf_cookie_view),
    path("auth/login/", views.login_view),
    path("auth/logout/", views.logout_view),
    path("auth/me/", views.me_view),
    path("send-mail/", views.send_mail_view),
]
