import json
import re

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.core.mail import EmailMessage, get_connection
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_http_methods, require_POST

MAX_BCC = 100
MAX_HTML_LENGTH = 600_000
MAX_SUBJECT_LENGTH = 500


def _json_error(status: int, message: str):
    return JsonResponse({"ok": False, "error": message}, status=status)


def _parse_json_body(request):
    try:
        return json.loads(request.body.decode("utf-8") or "{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def is_email(s: str) -> bool:
    if not isinstance(s, str):
        return False
    t = s.strip()
    if len(t) > 254:
        return False
    return bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", t))


@ensure_csrf_cookie
@require_http_methods(["GET"])
def csrf_cookie_view(request):
    return JsonResponse({"ok": True})


@require_POST
def login_view(request):
    data = _parse_json_body(request)
    if data is None:
        return _json_error(400, "Invalid JSON body")
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return _json_error(400, "username and password required")
    user = authenticate(request, username=username, password=password)
    if user is None:
        return _json_error(401, "用户名或密码错误")
    if not user.is_active:
        return _json_error(403, "账号已停用")
    login(request, user)
    return JsonResponse({"ok": True, "username": user.username})


@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"ok": True})


@require_http_methods(["GET"])
def me_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({"authenticated": False})
    return JsonResponse(
        {"authenticated": True, "username": request.user.username}
    )


@require_POST
def send_mail_view(request):
    if not request.user.is_authenticated:
        return _json_error(401, "Unauthorized")

    if not settings.SMTP_USER or not settings.SMTP_PASS:
        return _json_error(
            500, "服务器未配置 SMTP：请设置环境变量 SMTP_USER / SMTP_PASS"
        )

    data = _parse_json_body(request)
    if data is None:
        return _json_error(400, "Invalid JSON body")

    subject = data.get("subject") if isinstance(data.get("subject"), str) else ""
    subject = subject.strip()
    html = data.get("html") if isinstance(data.get("html"), str) else ""
    bcc_raw = data.get("bcc") if isinstance(data.get("bcc"), list) else []

    if not subject:
        return _json_error(400, "subject required")
    if len(subject) > MAX_SUBJECT_LENGTH:
        return _json_error(400, "subject too long")
    if not html:
        return _json_error(400, "html required")
    if len(html) > MAX_HTML_LENGTH:
        return _json_error(400, "html too long")

    bcc = []
    seen = set()
    for e in bcc_raw:
        if not isinstance(e, str):
            continue
        t = e.strip()
        if not is_email(t):
            continue
        if t.lower() not in seen:
            seen.add(t.lower())
            bcc.append(t)

    if not bcc:
        return _json_error(400, "bcc must contain at least one valid email")
    if len(bcc) > MAX_BCC:
        return _json_error(400, f"bcc exceeds limit ({MAX_BCC})")

    safe_name = settings.SMTP_FROM_NAME.replace('"', "")
    from_email = f'"{safe_name}" <{settings.SMTP_USER}>'

    connection = get_connection(
        backend="django.core.mail.backends.smtp.EmailBackend",
        host=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER,
        password=settings.SMTP_PASS,
        use_tls=settings.SMTP_USE_TLS,
        use_ssl=settings.SMTP_USE_SSL,
    )

    msg = EmailMessage(
        subject=subject,
        body=html,
        from_email=from_email,
        to=[settings.SMTP_USER],
        connection=connection,
    )
    msg.content_subtype = "html"
    msg.bcc = bcc

    try:
        msg.send(fail_silently=False)
    except Exception as exc:
        return _json_error(502, str(exc) or "SMTP send failed")

    return JsonResponse(
        {"ok": True, "message": "Message sent", "accepted": len(bcc)}
    )
