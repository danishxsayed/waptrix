export const getEmailTemplate = (title: string, message: string, buttonText: string, buttonUrl: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #080A0F; color: #E2E8F0; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 40px auto; background-color: #0E1117; border: 1px solid #273042; border-radius: 24px; overflow: hidden; }
        .header { padding: 40px; text-align: center; background: linear-gradient(135deg, #0E1117 0%, #161B26 100%); }
        .logo { background-color: #10B981; color: #080A0F; padding: 12px; border-radius: 12px; font-weight: bold; font-size: 24px; display: inline-block; box-shadow: 0 0 20px rgba(16,185,129,0.3); }
        .content { padding: 40px; text-align: center; }
        h1 { font-size: 28px; font-weight: 800; color: #E2E8F0; margin-bottom: 20px; }
        p { font-size: 16px; line-height: 1.6; color: #8896AB; margin-bottom: 30px; }
        .button { display: inline-block; background-color: #10B981; color: #080A0F; padding: 16px 32px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 16px; transition: all 0.2s; box-shadow: 0 0 15px rgba(16,185,129,0.2); }
        .footer { padding: 30px; text-align: center; border-top: 1px solid #273042; background-color: #080A0F; }
        .footer p { font-size: 12px; color: #4A5568; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">W</div>
            <h2 style="color: #10B981; margin-top: 20px; font-size: 20px;">Waptrix</h2>
        </div>
        <div class="content">
            <h1>${title}</h1>
            <p>${message}</p>
            <a href="${buttonUrl}" class="button">${buttonText}</a>
            <p style="margin-top: 30px; font-size: 14px; opacity: 0.7;">If you didn't request this, you can safely ignore this email.</p>
        </div>
        <div class="footer">
            <p>&copy; 2026 Waptrix | The WhatsApp Marketing Platform</p>
            <p style="margin-top: 10px;">Sent from Waptrix Cloud</p>
        </div>
    </div>
</body>
</html>
`;
