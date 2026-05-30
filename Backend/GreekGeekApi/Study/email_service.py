from django.conf import settings
import requests
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        # From-address is configured via DEFAULT_FROM_EMAIL (env: DEFAULT_FROM_EMAIL).
        self.from_email = settings.DEFAULT_FROM_EMAIL

    def _send(self, to_email, subject, html_content, plain_text_content):
        """Send a multipart (text + HTML) email via the ZeptoMail HTTP API.

        Uses HTTPS (port 443) rather than SMTP because some hosts (e.g. DigitalOcean
        droplets) block outbound SMTP ports 25/465/587 by default.
        """
        token = settings.ZEPTOMAIL_TOKEN
        auth = token if token.startswith("Zoho-enczapikey") else f"Zoho-enczapikey {token}"
        resp = requests.post(
            settings.ZEPTOMAIL_API_URL,
            headers={
                "Authorization": auth,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            json={
                "from": {"address": self.from_email, "name": "GreekGeek"},
                "to": [{"email_address": {"address": to_email}}],
                "subject": subject,
                "htmlbody": html_content,
                "textbody": plain_text_content,
            },
            timeout=15,
        )
        if resp.status_code >= 400:
            # Surface ZeptoMail's error detail before raising (caught/logged by callers).
            logger.error("ZeptoMail API error %s: %s", resp.status_code, resp.text)
            resp.raise_for_status()
    
    def send_password_reset_email(self, user_email, reset_token, user_name=None):
        """
        Send password reset email to user
        """
        try:
            # Create the reset link
            reset_link = f"{settings.FRONTEND_URL}/reset-password/{reset_token}/"
            
            # Prepare email content
            subject = "Reset Your GreekGeek Password"
            
            # HTML content
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Reset Your Password</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        text-align: center;
                        padding: 20px 0;
                        border-bottom: 2px solid #0d6efd;
                        margin-bottom: 30px;
                    }}
                    .logo {{
                        font-size: 28px;
                        font-weight: bold;
                        color: #0d6efd;
                    }}
                    .content {{
                        padding: 20px 0;
                    }}
                    .button {{
                        display: inline-block;
                        padding: 12px 30px;
                        background-color: #0d6efd;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bold;
                        margin: 20px 0;
                    }}
                    .footer {{
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                        font-size: 14px;
                        color: #666;
                        text-align: center;
                    }}
                    .warning {{
                        background-color: #fff3cd;
                        border: 1px solid #ffeaa7;
                        border-radius: 5px;
                        padding: 15px;
                        margin: 20px 0;
                    }}
                    @media (max-width: 480px) {{
                        body {{
                            padding: 10px;
                        }}
                        .button {{
                            display: block;
                            text-align: center;
                            width: 100%;
                            box-sizing: border-box;
                        }}
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">📚 GreekGeek</div>
                </div>
                
                <div class="content">
                    <h2>Reset Your Password</h2>
                    <p>Hello{f', {user_name}' if user_name else ''}!</p>
                    
                    <p>We received a request to reset your password for your GreekGeek account. If you made this request, click the button below to reset your password:</p>
                    
                    <p style="text-align: center;">
                        <a href="{reset_link}" class="button">Reset Password</a>
                    </p>
                    
                    <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">
                        {reset_link}
                    </p>
                    
                    <div class="warning">
                        <strong>⚠️ Important:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, you can safely ignore this email.
                    </div>
                </div>
                
                <div class="footer">
                    <p>© 2024 GreekGeek. All rights reserved.</p>
                    <p>This email was sent to {user_email}. If you have any questions, please contact our support team.</p>
                </div>
            </body>
            </html>
            """
            
            # Plain text version
            plain_text_content = f"""
            Reset Your GreekGeek Password
            
            Hello{f', {user_name}' if user_name else ''}!
            
            We received a request to reset your password for your GreekGeek account. 
            If you made this request, click the link below to reset your password:
            
            {reset_link}
            
            Important: This link will expire in 1 hour for security reasons. 
            If you didn't request this password reset, you can safely ignore this email.
            
            © 2024 GreekGeek. All rights reserved.
            """
            
            self._send(user_email, subject, html_content, plain_text_content)
            logger.info(f"Password reset email sent to {user_email}.")
            return True

        except Exception:
            logger.exception(f"Failed to send password reset email to {user_email}")
            return False
    
    def send_password_reset_confirmation_email(self, user_email, user_name=None):
        """
        Send confirmation email after password has been successfully reset
        """
        try:
            subject = "Your GreekGeek Password Has Been Reset"
            
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset Confirmation</title>
                <style>
                    body {{
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }}
                    .header {{
                        text-align: center;
                        padding: 20px 0;
                        border-bottom: 2px solid #198754;
                        margin-bottom: 30px;
                    }}
                    .logo {{
                        font-size: 28px;
                        font-weight: bold;
                        color: #198754;
                    }}
                    .content {{
                        padding: 20px 0;
                    }}
                    .success {{
                        background-color: #d1edff;
                        border: 1px solid #74c0fc;
                        border-radius: 5px;
                        padding: 15px;
                        margin: 20px 0;
                        text-align: center;
                    }}
                    .footer {{
                        margin-top: 40px;
                        padding-top: 20px;
                        border-top: 1px solid #eee;
                        font-size: 14px;
                        color: #666;
                        text-align: center;
                    }}
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">📚 GreekGeek</div>
                </div>
                
                <div class="content">
                    <h2>Password Reset Successful</h2>
                    <p>Hello{f', {user_name}' if user_name else ''}!</p>
                    
                    <div class="success">
                        <strong>✅ Your password has been successfully reset!</strong>
                    </div>
                    
                    <p>Your GreekGeek account password has been updated. You can now log in with your new password.</p>
                    
                    <p>If you did not make this change, please contact our support team immediately.</p>
                </div>
                
                <div class="footer">
                    <p>© 2024 GreekGeek. All rights reserved.</p>
                    <p>This email was sent to {user_email}.</p>
                </div>
            </body>
            </html>
            """
            
            plain_text_content = f"""
            Password Reset Successful
            
            Hello{f', {user_name}' if user_name else ''}!
            
            Your GreekGeek account password has been successfully reset. 
            You can now log in with your new password.
            
            If you did not make this change, please contact our support team immediately.
            
            © 2024 GreekGeek. All rights reserved.
            """
            
            self._send(user_email, subject, html_content, plain_text_content)
            logger.info(f"Password reset confirmation email sent to {user_email}.")
            return True

        except Exception:
            logger.exception(f"Failed to send password reset confirmation email to {user_email}")
            return False