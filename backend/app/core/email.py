"""
Email sending module for ExamGuard.

When EMAIL_ENABLED=False  → credentials are returned in the API response
                             so the recruiter can share them manually / see them in the dashboard.
When EMAIL_ENABLED=True   → sends real email via Gmail SMTP (or any SMTP).

To enable Gmail:
  1. Google Account → Security → 2-Step Verification (enable it)
  2. Google Account → Security → App Passwords → create one for "Mail"
  3. In backend/.env set:
       SMTP_USER=yourname@gmail.com
       SMTP_PASS=xxxx xxxx xxxx xxxx   (16-char app password)
       FROM_EMAIL=yourname@gmail.com
       EMAIL_ENABLED=True
"""
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings


def send_invite_email(
    to_email: str,
    candidate_name: str,
    exam_title: str,
    exam_window_start: str,
    exam_window_end: str,
    duration_minutes: int,
    invite_link: str,
    username: str,
    temp_password: str,
) -> bool:
    """
    Returns True if email was sent, False if EMAIL_ENABLED is False or sending failed.
    """
    if not settings.EMAIL_ENABLED:
        print(f"[EMAIL DISABLED] Would have sent invite to {to_email} | pwd={temp_password}")
        return False

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#0d0f17; color:#e2e8f0; margin:0; padding:0; }}
    .container {{ max-width:560px; margin:40px auto; background:#161b2e; border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); }}
    .header {{ background:linear-gradient(135deg,#6d28d9,#4f46e5); padding:32px; text-align:center; }}
    .header h1 {{ margin:0; color:#fff; font-size:22px; font-weight:700; letter-spacing:-0.5px; }}
    .header p {{ margin:6px 0 0; color:rgba(255,255,255,0.7); font-size:13px; }}
    .body {{ padding:32px; }}
    .body p {{ color:#94a3b8; font-size:14px; line-height:1.6; margin:0 0 16px; }}
    .creds {{ background:#0d1117; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:20px; margin:20px 0; }}
    .creds-row {{ display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06); }}
    .creds-row:last-child {{ border-bottom:none; }}
    .creds-label {{ font-size:12px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; }}
    .creds-value {{ font-size:14px; color:#e2e8f0; font-family:monospace; font-weight:600; }}
    .btn {{ display:block; width:fit-content; margin:24px auto 0; padding:14px 32px; background:linear-gradient(135deg,#6d28d9,#4f46e5); color:#fff; text-decoration:none; border-radius:10px; font-weight:700; font-size:15px; text-align:center; }}
    .info-row {{ display:flex; gap:16px; margin:20px 0; }}
    .info-card {{ flex:1; background:#0d1117; border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:14px; text-align:center; }}
    .info-card .val {{ font-size:16px; font-weight:700; color:#a78bfa; }}
    .info-card .lbl {{ font-size:11px; color:#64748b; margin-top:4px; }}
    .footer {{ padding:20px 32px; border-top:1px solid rgba(255,255,255,0.06); text-align:center; }}
    .footer p {{ font-size:11px; color:#475569; margin:0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ ExamGuard</h1>
      <p>You've been invited to an assessment</p>
    </div>
    <div class="body">
      <p>Hello <strong style="color:#e2e8f0">{candidate_name}</strong>,</p>
      <p>You have been selected to take the following assessment. Please read the details carefully and use the credentials below to log in.</p>

      <div class="info-row">
        <div class="info-card">
          <div class="val">⏱️ {duration_minutes}m</div>
          <div class="lbl">Duration</div>
        </div>
        <div class="info-card">
          <div class="val">📅</div>
          <div class="lbl">From {exam_window_start}</div>
        </div>
        <div class="info-card">
          <div class="val">🔒</div>
          <div class="lbl">AI Proctored</div>
        </div>
      </div>

      <p style="font-size:13px;color:#64748b;margin:0 0 8px"><strong style="color:#94a3b8">Exam:</strong> {exam_title}</p>

      <div class="creds">
        <div class="creds-row">
          <span class="creds-label">Username / Email</span>
          <span class="creds-value">{username}</span>
        </div>
        <div class="creds-row">
          <span class="creds-label">Temporary Password</span>
          <span class="creds-value">{temp_password}</span>
        </div>
      </div>

      <p style="font-size:12px;color:#64748b">
        ⚠️ If you have the ExamGuard desktop app installed, click the button below — it will open automatically and pre-fill your credentials.
        If not, you'll be redirected to the download page.
      </p>

      <a href="{invite_link}" class="btn">Open ExamGuard App →</a>
    </div>
    <div class="footer">
      <p>This invite is valid until {exam_window_end}. Do not share your credentials with anyone.</p>
      <p style="margin-top:6px">ExamGuard — Secure AI-Proctored Examination Platform</p>
    </div>
  </div>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"📋 Exam Invitation: {exam_title}"
    msg["From"] = f"ExamGuard <{settings.FROM_EMAIL}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))

    try:
        context = ssl.create_default_context()
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.ehlo()
            server.starttls(context=context)
            server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.FROM_EMAIL, to_email, msg.as_string())
        print(f"[EMAIL] Sent invite to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")
        return False
