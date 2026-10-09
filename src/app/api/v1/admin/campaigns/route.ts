import { recordAudit } from '@/server/auth/audit';
import { hashIp } from '@/server/auth/auth.service';
import {
  createCampaign,
  createCampaignSchema,
  listCampaigns,
} from '@/server/campaigns/campaigns.service';
import { clientIp, handler, parseBody } from '@/server/http';

export const GET = handler(() => listCampaigns(), { admin: true });

export const POST = handler(
  async (request) => {
    const campaign = await createCampaign(
      await parseBody(request, createCampaignSchema),
    );
    await recordAudit('CAMPAIGN_CREATE', hashIp(clientIp(request)), {
      campaignId: campaign.id,
      name: campaign.name,
    });
    return campaign;
  },
  { admin: true, status: 201 },
);
