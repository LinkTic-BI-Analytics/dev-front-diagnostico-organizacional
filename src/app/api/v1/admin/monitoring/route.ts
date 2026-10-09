import { getMonitoring } from '@/server/analytics/analytics.service';
import { analyticsView } from '@/server/analytics/view-handler';

export const GET = analyticsView(getMonitoring);
