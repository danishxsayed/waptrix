import axios from 'axios';

const META_API_VERSION = 'v19.0';
const GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export interface MetaTemplate {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  components: any[];
}

export const metaApi = {
  /**
   * Exchange short-lived code for long-lived access token
   */
  async exchangeCodeForToken(code: string) {
    const response = await axios.get(`${GRAPH_URL}/oauth/access_token`, {
      params: {
        client_id: process.env.NEXT_PUBLIC_META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        code,
      },
    });
    return response.data;
  },

  /**
   * Debugs the token to find granular scopes (like waba_id)
   */
  async debugToken(inputToken: string) {
    const response = await axios.get(`${GRAPH_URL}/debug_token`, {
      params: {
        input_token: inputToken,
        access_token: `${process.env.NEXT_PUBLIC_META_APP_ID}|${process.env.META_APP_SECRET}`,
      },
    });
    return response.data;
  },

  /**
   * Get WABA phone numbers
   */
  async getPhoneNumbers(accessToken: string, wabaId: string) {
    const response = await axios.get(`${GRAPH_URL}/${wabaId}/phone_numbers`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  },

  /**
   * Submit a template to Meta for approval
   */
  async submitTemplate(accessToken: string, wabaId: string, template: MetaTemplate) {
    const response = await axios.post(
      `${GRAPH_URL}/${wabaId}/message_templates`,
      template,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return response.data;
  },

  /**
   * Send a template message
   */
  async sendTemplateMessage(
    accessToken: string,
    phoneNumberId: string,
    payload: {
      to: string;
      templateName: string;
      languageCode: string;
      components?: any[]; // undefined = omit the key; [] still omitted below
    }
  ) {
    const templateBody: Record<string, any> = {
      name: payload.templateName,
      language: { code: payload.languageCode },
    };
    // Only include components if there are actual entries — Meta rejects explicit []
    // for templates that have no variables/headers
    if (payload.components && payload.components.length > 0) {
      templateBody.components = payload.components;
    }

    const response = await axios.post(
      `${GRAPH_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type:    'individual',
        to:                payload.to,
        type:              'template',
        template:          templateBody,
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    return response.data;
  },

  /**
   * Get template status from Meta
   */
  async getTemplateStatus(accessToken: string, templateId: string) {
    const response = await axios.get(`${GRAPH_URL}/${templateId}`, {
      params: { fields: 'id,name,status,category,rejected_reason' },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  },

  /**
   * Update an existing approved template on Meta (puts it back to PENDING)
   * POST /{message-template-id}  { components: [...] }
   */
  async updateTemplate(accessToken: string, templateId: string, components: any[]) {
    const response = await axios.post(
      `${GRAPH_URL}/${templateId}`,
      { components },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response.data;
  },

  /**
   * Appeal a Meta category reclassification.
   * For APPROVED templates: use appeal_category field.
   * For PENDING/FLAGGED templates: use category field.
   * POST /{message-template-id}  { appeal_category: "UTILITY" | "MARKETING" }
   */
  async appealCategory(accessToken: string, templateId: string, category: string, isApproved = false) {
    // Approved templates require "appeal_category"; non-approved use "category"
    const payload = isApproved ? { appeal_category: category } : { category };
    const response = await axios.post(
      `${GRAPH_URL}/${templateId}`,
      payload,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    return response.data;
  },

  /**
   * Delete a template from Meta
   */
  async deleteTemplate(accessToken: string, wabaId: string, templateName: string) {
    const response = await axios.delete(`${GRAPH_URL}/${wabaId}/message_templates`, {
      params: { name: templateName },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return response.data;
  },
};
