// ─── Shared layout helpers (light theme) ────────────────────────────────────

const HEADER = `
  <tr>
    <td style="padding:28px 40px 24px;background:#ffffff;text-align:center;border-bottom:1px solid #E2E8F0;">
      <table cellpadding="0" cellspacing="0" style="display:inline-table;">
        <tr>
          <td style="vertical-align:middle;">
            <div style="background:#10B981;color:#ffffff;width:34px;height:34px;border-radius:9px;text-align:center;line-height:34px;font-weight:900;font-size:19px;display:inline-block;">W</div>
          </td>
          <td style="vertical-align:middle;padding-left:9px;">
            <span style="color:#0F172A;font-size:19px;font-weight:800;letter-spacing:-0.4px;">Waptrix</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;

const FOOTER = `
  <tr>
    <td style="padding:22px 40px;text-align:center;background:#F8FAFC;border-top:1px solid #E2E8F0;">
      <p style="margin:0 0 3px;font-size:13px;color:#10B981;font-weight:700;">Waptrix</p>
      <p style="margin:0 0 3px;font-size:11px;color:#94A3B8;">WhatsApp Marketing Platform</p>
      <p style="margin:0;font-size:11px;color:#CBD5E1;">Powered by <strong style="color:#94A3B8;">Crawlers Technologies</strong></p>
    </td>
  </tr>`;

const wrap = (inner: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #E2E8F0;border-radius:20px;overflow:hidden;">
          ${inner}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ─── Generic transactional email (auth, invite, etc.) ────────────────────────

export const getEmailTemplate = (
  title: string,
  message: string,
  buttonText: string,
  buttonUrl: string,
) => wrap(`
  ${HEADER}
  <tr>
    <td style="padding:40px;text-align:center;">
      <h1 style="margin:0 0 16px;font-size:26px;font-weight:800;color:#0F172A;">${title}</h1>
      <p style="margin:0 0 32px;font-size:15px;line-height:1.7;color:#64748B;">${message}</p>
      <a href="${buttonUrl}" style="display:inline-block;background-color:#10B981;color:#ffffff;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;">
        ${buttonText}
      </a>
      <p style="margin:28px 0 0;font-size:13px;color:#94A3B8;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </td>
  </tr>
  ${FOOTER}`);

// ─── Template status (APPROVED / REJECTED) ───────────────────────────────────

export const getTemplateStatusEmail = (
  templateName: string,
  status: 'APPROVED' | 'REJECTED',
  rejectionReason: string | null,
  dashboardUrl: string,
) => {
  const ok = status === 'APPROVED';
  const accent = ok ? '#10B981' : '#EF4444';
  const bg     = ok ? '#ECFDF5' : '#FEF2F2';
  const border = ok ? '#A7F3D0' : '#FECACA';
  const heading = ok ? 'Template Approved! 🎉' : 'Template Rejected';
  const sub = ok
    ? `Your WhatsApp template <strong style="color:#0F172A;">${templateName}</strong> has been approved by Meta. It's ready to use in campaigns.`
    : `Your WhatsApp template <strong style="color:#0F172A;">${templateName}</strong> was reviewed by Meta and could not be approved at this time.`;

  return wrap(`
  ${HEADER}
  <tr>
    <td style="padding:32px 40px 0;">
      <div style="background:${bg};border:1px solid ${border};border-radius:14px;padding:24px;text-align:center;">
        <h1 style="margin:0 0 10px;font-size:24px;font-weight:800;color:#0F172A;">${heading}</h1>
        <p style="margin:0;font-size:14px;color:#64748B;line-height:1.65;">${sub}</p>
      </div>
    </td>
  </tr>
  ${rejectionReason ? `
  <tr>
    <td style="padding:20px 40px 0;">
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#EF4444;text-transform:uppercase;letter-spacing:1px;">Rejection Reason</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">${rejectionReason}</p>
      </div>
    </td>
  </tr>` : ''}
  <tr>
    <td style="padding:24px 40px 0;">
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">
        ${ok ? 'What you can do now' : 'Next steps'}
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="36" valign="top" style="padding-top:2px;">
            <div style="width:28px;height:28px;background:${bg};border:1px solid ${border};border-radius:8px;text-align:center;line-height:28px;font-size:14px;">${ok ? '🚀' : '✏️'}</div>
          </td>
          <td style="padding-left:12px;font-size:14px;color:#64748B;line-height:1.6;">
            ${ok ? 'Use this template in broadcast campaigns immediately.' : 'Edit your template to address the rejection reason.'}
          </td>
        </tr>
        <tr><td colspan="2" style="height:10px;"></td></tr>
        <tr>
          <td width="36" valign="top" style="padding-top:2px;">
            <div style="width:28px;height:28px;background:${bg};border:1px solid ${border};border-radius:8px;text-align:center;line-height:28px;font-size:14px;">${ok ? '📊' : '🔄'}</div>
          </td>
          <td style="padding-left:12px;font-size:14px;color:#64748B;line-height:1.6;">
            ${ok ? 'Track delivery and read rates from your Waptrix dashboard.' : 'Resubmit the updated template for Meta review.'}
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 40px;text-align:center;">
      <a href="${dashboardUrl}" style="display:inline-block;background-color:${accent};color:#ffffff;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;">
        ${ok ? 'Go to Templates →' : 'Edit Template →'}
      </a>
    </td>
  </tr>
  ${FOOTER}`);
};

// ─── Template category change ─────────────────────────────────────────────────

export const getCategoryChangeEmail = (
  templateName: string,
  previousCategory: string,
  newCategory: string,
  dashboardUrl: string,
) => {
  const fmt = (c: string) => c.charAt(0) + c.slice(1).toLowerCase();
  return wrap(`
  ${HEADER}
  <tr>
    <td style="padding:32px 40px 0;">
      <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:14px;padding:24px;text-align:center;">
        <div style="font-size:36px;margin-bottom:10px;">🔄</div>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#0F172A;">Template Category Changed</h1>
        <p style="margin:0;font-size:14px;color:#64748B;line-height:1.65;">
          Meta has changed the category of your template <strong style="color:#0F172A;">${templateName}</strong>.
        </p>
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding:24px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:45%;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 20px;text-align:center;vertical-align:top;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">Previous</p>
            <p style="margin:0;font-size:18px;font-weight:800;color:#374151;">${fmt(previousCategory)}</p>
          </td>
          <td style="width:10%;text-align:center;vertical-align:middle;font-size:20px;color:#F59E0B;">→</td>
          <td style="width:45%;background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:16px 20px;text-align:center;vertical-align:top;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#D97706;text-transform:uppercase;letter-spacing:1px;">New</p>
            <p style="margin:0;font-size:18px;font-weight:800;color:#92400E;">${fmt(newCategory)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:20px 40px 0;">
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:12px;padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#EF4444;text-transform:uppercase;letter-spacing:1px;">⚠️ Important</p>
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
          The new category <strong>${fmt(newCategory)}</strong> may affect messaging charges and limits.
          ${newCategory === 'MARKETING' ? 'Marketing templates have a per-conversation fee. Please review your campaign costs.' : ''}
        </p>
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 40px;text-align:center;">
      <a href="${dashboardUrl}" style="display:inline-block;background-color:#F59E0B;color:#ffffff;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;">
        Review Template →
      </a>
    </td>
  </tr>
  ${FOOTER}`);
};

// ─── Campaign analytics email ─────────────────────────────────────────────────
// Sent the moment a campaign finishes. Delivered/read counts come in via
// async WhatsApp webhooks (can take minutes), so we show only sent/failed
// here and point users to the dashboard for live delivered/read stats.

export const getCampaignAnalyticsEmail = (params: {
  campaignName: string;
  totalContacts: number;
  sent: number;
  failed: number;
  delivered: number;
  read: number;
  deliveryRate: number;
  readRate: number;
  dashboardUrl: string;
  completedAt: string;
}) => {
  const { campaignName, totalContacts, sent, failed, dashboardUrl, completedAt } = params;

  const sentRate   = totalContacts > 0 ? Number((sent / totalContacts * 100).toFixed(1)) : 0;
  const statusLabel = sentRate >= 90 ? 'Excellent' : sentRate >= 70 ? 'Good' : 'Needs Review';
  const statusColor = sentRate >= 90 ? '#10B981'   : sentRate >= 70 ? '#F59E0B' : '#EF4444';
  const statusBg    = sentRate >= 90 ? '#ECFDF5'   : sentRate >= 70 ? '#FFFBEB' : '#FEF2F2';

  return wrap(`
  ${HEADER}
  <tr>
    <td style="padding:32px 40px 0;">
      <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:14px;padding:24px;text-align:center;">
        <div style="font-size:36px;margin-bottom:10px;">📊</div>
        <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#0F172A;">Campaign Complete!</h1>
        <p style="margin:0;font-size:14px;color:#64748B;">
          <strong style="color:#0F172A;">${campaignName}</strong> has finished sending.
        </p>
        <p style="margin:8px 0 0;font-size:12px;color:#94A3B8;">${completedAt}</p>
      </div>
    </td>
  </tr>

  <!-- Status badge -->
  <tr>
    <td style="padding:20px 40px 0;text-align:center;">
      <div style="display:inline-block;background:${statusBg};border:1px solid ${statusColor}44;border-radius:999px;padding:8px 20px;">
        <span style="font-size:13px;font-weight:700;color:${statusColor};">
          ${statusLabel} — ${sentRate}% sent successfully
        </span>
      </div>
    </td>
  </tr>

  <!-- Stats: total / sent / failed -->
  <tr>
    <td style="padding:24px 40px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:32%;padding:4px;">
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 12px;text-align:center;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;">Total</p>
              <p style="margin:0;font-size:24px;font-weight:800;color:#0F172A;">${totalContacts.toLocaleString()}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">contacts</p>
            </div>
          </td>
          <td style="width:32%;padding:4px;">
            <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:12px;padding:16px 12px;text-align:center;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#10B981;text-transform:uppercase;letter-spacing:1px;">Sent</p>
              <p style="margin:0;font-size:24px;font-weight:800;color:#10B981;">${sent.toLocaleString()}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#64748B;">${sentRate}%</p>
            </div>
          </td>
          <td style="width:32%;padding:4px;">
            <div style="background:${failed > 0 ? '#FEF2F2' : '#F8FAFC'};border:1px solid ${failed > 0 ? '#FECACA' : '#E2E8F0'};border-radius:12px;padding:16px 12px;text-align:center;">
              <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:${failed > 0 ? '#EF4444' : '#94A3B8'};text-transform:uppercase;letter-spacing:1px;">Failed</p>
              <p style="margin:0;font-size:24px;font-weight:800;color:${failed > 0 ? '#EF4444' : '#94A3B8'};">${failed.toLocaleString()}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#94A3B8;">not sent</p>
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Live stats note -->
  <tr>
    <td style="padding:20px 40px 0;">
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;padding:14px 18px;text-align:center;">
        <p style="margin:0;font-size:13px;color:#3B82F6;line-height:1.6;">
          📈 <strong>Delivered &amp; read counts</strong> arrive via WhatsApp webhooks — they update in real-time on your dashboard.<br/>
          <span style="color:#64748B;">Open Analytics to see live delivery and read rates.</span>
        </p>
      </div>
    </td>
  </tr>

  <tr>
    <td style="padding:32px 40px;text-align:center;">
      <a href="${dashboardUrl}" style="display:inline-block;background-color:#10B981;color:#ffffff;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;">
        View Live Analytics →
      </a>
    </td>
  </tr>
  ${FOOTER}`);
};
