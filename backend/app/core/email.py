"""
Email sending module for ExamGuard.

When EMAIL_ENABLED=False  → credentials are returned in the API response
                             so the recruiter can share them manually / see them in the dashboard.
When EMAIL_ENABLED=True   → sends real email via Gmail SMTP (or configured SMTP).
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
    token: str = "",
    deep_link: str = "",
) -> bool:
    """
    Sends an invitation email with full exam schedule, credentials, and web/desktop launch links.
    """
    if not settings.EMAIL_ENABLED:
        print(f"[EMAIL DISABLED] Would have sent invite to {to_email} | pwd={temp_password}")
        return False

    app_deep_link = deep_link or f"examguard://login?token={token}"

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#0d0f17; color:#e2e8f0; margin:0; padding:0; }}
    .container {{ max-width:580px; margin:40px auto; background:#161b2e; border-radius:16px; overflow:hidden; border:1px solid rgba(255,255,255,0.1); }}
    .header {{ background:linear-gradient(135deg,#6d28d9,#4f46e5); padding:32px; text-align:center; }}
    .header h1 {{ margin:0; color:#fff; font-size:24px; font-weight:700; letter-spacing:-0.5px; }}
    .header p {{ margin:6px 0 0; color:rgba(255,255,255,0.85); font-size:14px; }}
    .body {{ padding:32px; }}
    .body p {{ color:#94a3b8; font-size:14px; line-height:1.6; margin:0 0 16px; }}
    .exam-title-box {{ background:#0d1117; border:1px solid rgba(99,102,241,0.3); border-radius:12px; padding:16px; margin-bottom:20px; }}
    .exam-title-box h2 {{ margin:0 0 6px; color:#fff; font-size:16px; }}
    .exam-title-box p {{ margin:0; font-size:12px; color:#818cf8; }}
    .info-grid {{ display:flex; gap:12px; margin:20px 0; }}
    .info-card {{ flex:1; background:#0d1117; border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:12px 8px; text-align:center; }}
    .info-card .val {{ font-size:14px; font-weight:700; color:#a78bfa; margin-bottom:4px; }}
    .info-card .lbl {{ font-size:11px; color:#64748b; text-transform:uppercase; letter-spacing:0.5px; }}
    .creds {{ background:#0d1117; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:18px 20px; margin:20px 0; }}
    .creds-row {{ display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-bottom:1px solid rgba(255,255,255,0.06); }}
    .creds-row:last-child {{ border-bottom:none; }}
    .creds-label {{ font-size:12px; color:#94a3b8; font-weight:600; }}
    .creds-value {{ font-size:14px; color:#38bdf8; font-family:monospace; font-weight:700; }}
    .btn {{ display:block; width:fit-content; margin:24px auto 16px; padding:14px 32px; background:linear-gradient(135deg,#6d28d9,#4f46e5); color:#ffffff !important; text-decoration:none; border-radius:10px; font-weight:700; font-size:15px; text-align:center; box-shadow:0 4px 14px rgba(99,102,241,0.4); }}
    .instructions {{ background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:16px; margin:20px 0; font-size:12px; color:#94a3b8; line-height:1.6; }}
    .instructions strong {{ color:#e2e8f0; }}
    .footer {{ padding:20px 32px; border-top:1px solid rgba(255,255,255,0.06); text-align:center; }}
    .footer p {{ font-size:11px; color:#475569; margin:0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🛡️ ExamGuard Assessment</h1>
      <p>Official Examination Invitation & Access Credentials</p>
    </div>
    <div class="body">
      <p>Hello <strong style="color:#e2e8f0">{candidate_name}</strong>,</p>
      <p>You have been scheduled to take an online proctored assessment. Please review the schedule and log in using the credentials below.</p>

      <div class="exam-title-box">
        <h2>{exam_title}</h2>
        <p>🔒 AI Proctored & Windows Kiosk Secured Assessment</p>
      </div>

      <div class="info-grid">
        <div class="info-card">
          <div class="val">⏱️ {duration_minutes} Mins</div>
          <div class="lbl">Duration</div>
        </div>
        <div class="info-card">
          <div class="val">📅 {exam_window_start}</div>
          <div class="lbl">Scheduled Start</div>
        </div>
        <div class="info-card">
          <div class="val">⏳ {exam_window_end}</div>
          <div class="lbl">Valid Until</div>
        </div>
      </div>

      <div class="creds">
        <div class="creds-row">
          <span class="creds-label">Candidate Email:</span>
          <span class="creds-value">{username}</span>
        </div>
        <div class="creds-row">
          <span class="creds-label">Temporary Password:</span>
          <span class="creds-value">{temp_password}</span>
        </div>
        {f'<div class="creds-row"><span class="creds-label">Access Token:</span><span class="creds-value">{token}</span></div>' if token else ''}
      </div>

      <a href="{invite_link}" class="btn" target="_blank">Open Candidate Portal & Launch Exam →</a>

      <div class="instructions">
        <strong>How to take your exam:</strong><br>
        1. <strong>Click the button above</strong> to open your personal Candidate Portal. From there, you can launch the ExamGuard desktop application with 1 click.<br>
        2. <strong>Or open ExamGuard directly</strong> on your PC and enter your Candidate Email and Temporary Password.<br>
        3. <em>Desktop App Protocol:</em> <a href="{app_deep_link}" style="color:#818cf8; word-break:break-all;">{app_deep_link}</a>
      </div>
    </div>
    <div class="footer">
      <p>This invite is strictly for {username}. Do not share your credentials with anyone.</p>
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


def send_otp_email(to_email: str, otp_code: str, candidate_name: str = "Candidate") -> bool:
    """
    Sends a 6-digit verification code email to the specified address.
    """
    if not settings.EMAIL_ENABLED:
        print(f"[EMAIL DISABLED] Would have sent OTP {otp_code} to {to_email}")
        return False

    html_body = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#0d0f17; color:#e2e8f0; margin:0; padding:0; }}
    .container {{ max-width:480px; margin:40px auto; background:#161b2e; border-radius:16px; padding:32px; border:1px solid rgba(255,255,255,0.1); text-align:center; }}
    .logo {{ font-size:36px; margin-bottom:12px; }}
    h1 {{ color:#fff; font-size:22px; margin:0 0 8px; }}
    p {{ color:#94a3b8; font-size:14px; margin:0 0 24px; line-height:1.5; }}
    .code-box {{ background:#0d1117; border:1.5px solid #6366f1; border-radius:12px; padding:20px; font-size:32px; font-weight:800; color:#38bdf8; letter-spacing:8px; margin:20px 0; font-family:monospace; }}
    .footer {{ margin-top:24px; font-size:12px; color:#475569; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🔐</div>
    <h1>Verification Code</h1>
    <p>Hello <strong>{candidate_name}</strong>,<br>Use the 6-digit verification code below to complete your login to ExamGuard.</p>
    <div class="code-box">{otp_code}</div>
    <p style="font-size:12px; color:#64748b;">This code is valid for 10 minutes. Do not share it with anyone.</p>
    <div class="footer">ExamGuard — Secure Examination Platform</div>
  </div>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🔑 ExamGuard Verification Code: {otp_code}"
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
        print(f"[EMAIL] Sent OTP {otp_code} to {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send OTP to {to_email}: {e}")
        return False

