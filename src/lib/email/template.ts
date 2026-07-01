/**
 * Beautiful branded email for template status notifications (APPROVED / REJECTED).
 * Features Crawlers Technologies branding alongside Waptrix.
 */
export const getTemplateStatusEmail = (
  templateName: string,
  status: 'APPROVED' | 'REJECTED',
  rejectionReason: string | null,
  dashboardUrl: string
) => {
  const isApproved = status === 'APPROVED';
  const accentColor = isApproved ? '#10B981' : '#F43F5E';
  const accentLight = isApproved ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)';
  const accentBorder = isApproved ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)';
  const icon = isApproved ? '&#x2705;' : '&#x274C;';
  const heading = isApproved ? 'Template Approved!' : 'Template Rejected';
  const subheading = isApproved
    ? `Great news! Your WhatsApp template <strong style="color:#E2E8F0;">${templateName}</strong> has been reviewed and approved by Meta. It's now ready to use in your campaigns.`
    : `Your WhatsApp template <strong style="color:#E2E8F0;">${templateName}</strong> was reviewed by Meta and could not be approved at this time.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:#080A0F;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#080A0F;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0E1117;border:1px solid #273042;border-radius:24px;overflow:hidden;">
          <tr>
            <td style="padding:36px 40px 28px;background:linear-gradient(135deg,#0E1117 0%,#161B26 100%);text-align:center;border-bottom:1px solid #1E293B;">
              <div style="display:inline-flex;align-items:center;gap:12px;justify-content:center;">
                <div style="background-color:#10B981;color:#080A0F;padding:10px 16px;border-radius:12px;font-weight:900;font-size:20px;letter-spacing:-0.5px;box-shadow:0 0 20px rgba(16,185,129,0.35);">W</div>
                <span style="color:#10B981;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Waptrix</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 0;">
              <div style="background:${accentLight};border:1px solid ${accentBorder};border-radius:16px;padding:24px;text-align:center;">
                <div style="font-size:40px;margin-bottom:10px;">${icon}</div>
                <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#E2E8F0;">${heading}</h1>
                <p style="margin:0;font-size:15px;color:#8896AB;line-height:1.65;">${subheading}</p>
              </div>
            </td>
          </tr>
          ${rejectionReason ? `
          <tr>
            <td style="padding:20px 40px 0;">
              <div style="background:rgba(244,63,94,0.07);border:1px solid rgba(244,63,94,0.2);border-radius:12px;padding:16px 20px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#F43F5E;text-transform:uppercase;letter-spacing:1px;">Rejection Reason</p>
                <p style="margin:0;font-size:14px;color:#CBD5E1;line-height:1.6;">${rejectionReason}</p>
              </div>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding:24px 40px 0;">
              <p style="margin:0 0 14px;font-size:11px;font-weight:700;color:#4A5568;text-transform:uppercase;letter-spacing:1px;">${isApproved ? 'What you can do now' : 'Next steps'}</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="36" valign="top" style="padding-top:2px;">
                    <div style="width:28px;height:28px;background:${accentLight};border-radius:8px;text-align:center;line-height:28px;font-size:14px;">${isApproved ? '&#x1F680;' : '&#x270F;&#xFE0F;'}</div>
                  </td>
                  <td style="padding-left:12px;font-size:14px;color:#8896AB;line-height:1.6;">${isApproved ? 'Use this template in broadcast campaigns immediately.' : 'Edit your template to address the rejection reason.'}</td>
                </tr>
                <tr><td colspan="2" style="height:10px;"></td></tr>
                <tr>
                  <td width="36" valign="top" style="padding-top:2px;">
                    <div style="width:28px;height:28px;background:${accentLight};border-radius:8px;text-align:center;line-height:28px;font-size:14px;">${isApproved ? '&#x1F4CA;' : '&#x1F504;'}</div>
                  </td>
                  <td style="padding-left:12px;font-size:14px;color:#8896AB;line-height:1.6;">${isApproved ? 'Track delivery and read rates from your Waptrix dashboard.' : 'Resubmit the updated template for Meta review.'}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;text-align:center;">
              <a href="${dashboardUrl}" style="display:inline-block;background-color:${accentColor};color:#080A0F;padding:14px 36px;border-radius:12px;font-weight:800;font-size:15px;text-decoration:none;letter-spacing:-0.2px;">
                ${isApproved ? 'Go to Templates &rarr;' : 'Edit Template &rarr;'}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background:#1E293B;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px;text-align:center;background-color:#080A0F;">
              <p style="margin:0 0 4px;font-size:13px;color:#10B981;font-weight:700;">Waptrix</p>
              <p style="margin:0 0 4px;font-size:11px;color:#4A5568;">The WhatsApp Marketing Platform</p>
              <p style="margin:0;font-size:11px;color:#2D3748;">Powered by <strong style="color:#4A5568;">Crawlers Technologies</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

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
