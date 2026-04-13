export type Temperature = "cold" | "warm" | "hot";

export type ActivityType = "call" | "email" | "meeting" | "note" | "follow_up";

export type LeadSource =
  | "website"
  | "whatsapp"
  | "referido"
  | "redes_sociales"
  | "llamada_fria"
  | "email"
  | "formulario"
  | "evento"
  | "import"
  | "webhook"
  | "otro";

export type SocialPlatform = "whatsapp" | "instagram" | "facebook" | "messenger";

export type LoyaltyTierName = "none" | "bronce" | "plata" | "oro" | "esmeralda";

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: LeadSource;
  temperature: Temperature;
  score: number;
  notes: string | null;
  // Meta / Social
  whatsappPhone: string | null;
  instagramHandle: string | null;
  facebookId: string | null;
  preferredChannel: string | null;
  conversationCount: number;
  lastConversationAt: Date | null;
  // Loyalty
  loyaltyTier: string | null;
  loyaltyPoints: number;
  totalPurchases: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  title: string;
  value: number; // in cents
  stageId: string;
  contactId: string;
  expectedClose: Date | null;
  probability: number; // 0-100
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color: string;
  isWon: boolean;
  isLost: boolean;
}

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  contactId: string;
  dealId: string | null;
  scheduledAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
}

export interface CrmConfig {
  business: {
    type: string;
    industry: string;
    teamSize: string;
  };
  pipeline: {
    stages: Array<{
      name: string;
      order: number;
      color: string;
      isWon: boolean;
      isLost: boolean;
    }>;
  };
  leadSources: string[];
  preferences: {
    language: "es" | "en";
    theme: "light" | "dark" | "auto";
  };
}

// API response types
export interface DealWithContact extends Deal {
  contact?: Contact;
  stage?: PipelineStage;
  contactName?: string | null;
  contactTemperature?: string | null;
}

export interface ContactWithDeals extends Contact {
  deals?: Deal[];
  activities?: Activity[];
}

export interface PipelineColumn extends PipelineStage {
  deals: DealWithContact[];
}

export interface DashboardStats {
  totalContacts: number;
  activeDeals: number;
  totalPipelineValue: number;
  wonDealsValue: number;
  conversionRate: number;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  lostDeals: number;
  lostDealsValue: number;
  avgDealValue: number;
  totalDeals: number;
  wonDealsCount: number;
}

export interface SourceDistribution {
  source: string;
  label: string;
  count: number;
  color: string;
}

export interface PipelineStageData {
  name: string;
  count: number;
  value: number;
  color: string;
  isWon?: boolean;
}

export interface MonthlyMetric {
  month: string;
  contacts: number;
  deals: number;
  revenue: number;
}

export interface Conversation {
  id: string;
  contactId: string | null;
  platform: SocialPlatform;
  externalId: string | null;
  direction: "inbound" | "outbound";
  message: string | null;
  messageType: string;
  status: string;
  senderName: string | null;
  senderPhone: string | null;
  createdAt: Date;
}

export interface ConversationWithContact extends Conversation {
  contactName?: string | null;
  contactPhone?: string | null;
}

export interface LoyaltyTier {
  id: string;
  programId: string;
  name: string;
  minPoints: number;
  discountPercent: number;
  benefits: string;
  color: string;
  order: number;
}

export interface LoyaltyAction {
  id: string;
  contactId: string;
  action: string;
  points: number;
  description: string | null;
  dealId: string | null;
  createdAt: Date;
}

export interface LoyaltyContactView {
  id: string;
  name: string;
  whatsappPhone: string | null;
  loyaltyTier: string;
  loyaltyPoints: number;
  totalPurchases: number;
  temperature: string;
  activeDealsValue: number;
  closeToDeal: boolean;
}
