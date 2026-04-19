"use client";
export const dynamic = "force-dynamic";


import { useState, useEffect } from "react";
import { 
  Plus, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  BarChart2,
  MoreVertical,
  Activity
} from "lucide-react";
import axios from "axios";
import CampaignWizard from "@/components/campaigns/CampaignWizard";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
    const interval = setInterval(fetchCampaigns, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get("/api/campaigns");
      setCampaigns(res.data);
    } catch (err) {
      console.error("Failed to fetch campaigns", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sending':
        return <span className="bg-jade/10 text-jade px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-jade/20 flex items-center gap-1 animate-pulse"><Activity className="w-3 h-3" /> Sending</span>;
      case 'sent':
        return <span className="bg-sky-500/10 text-sky-500 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-sky-500/20 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sent</span>;
      case 'queued':
        return <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-amber-500/20 flex items-center gap-1"><Clock className="w-3 h-3" /> Queued</span>;
      case 'failed':
        return <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-rose-500/20 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Failed</span>;
      default:
        return <span className="bg-card text-text-muted px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-border">Draft</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-jade border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold font-syne">Marketing Campaigns</h2>
          <p className="text-sm text-text-muted font-dm-sans">Track and manage your bulk message blasts.</p>
        </div>
        <button 
          onClick={() => setIsWizardOpen(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="glass-card flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 flex flex-col md:flex-row gap-6 items-center w-full">
              <div className="w-14 h-14 bg-surface border border-border rounded-2xl flex items-center justify-center shrink-0">
                <Send className="w-6 h-6 text-jade" />
              </div>
              
              <div className="flex-1 space-y-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center gap-3">
                  <h3 className="font-bold font-syne text-lg">{campaign.name}</h3>
                  {getStatusBadge(campaign.status)}
                </div>
                <div className="flex items-center justify-center md:justify-start gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {campaign.segment?.name || "All Contacts"}</span>
                  <span className="flex items-center gap-1"><BarChart2 className="w-3 h-3" /> {campaign.template?.name}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 w-full max-w-md space-y-3">
              <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-text-muted">Progress</span>
                <span className="text-text-primary">{Math.round((campaign.sent_count / (campaign.total_contacts || 1)) * 100)}%</span>
              </div>
              <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-border">
                <div 
                  className="bg-jade h-full rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  style={{ width: `${(campaign.sent_count / (campaign.total_contacts || 1)) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase tracking-widest">
                <span>{campaign.sent_count} Sent</span>
                <span>{campaign.total_contacts} Total</span>
              </div>
            </div>

            <div className="flex items-center gap-4 border-l border-border/50 pl-8 h-12">
              <div className="text-center">
                <p className="text-xs font-bold text-text-primary">{campaign.delivered_count}</p>
                <p className="text-[10px] text-text-muted uppercase">Delivered</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-jade">{campaign.read_count}</p>
                <p className="text-[10px] text-text-muted uppercase">Read</p>
              </div>
              <button className="p-2 hover:bg-card rounded-xl transition-all">
                <MoreVertical className="w-4 h-4 text-text-muted" />
              </button>
            </div>
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-3xl space-y-4">
            <Send className="w-12 h-12 text-text-muted opacity-20" />
            <div className="text-center">
              <h3 className="font-bold font-syne">No campaigns yet</h3>
              <p className="text-xs text-text-muted mt-2">Launch your first message blast to reach your customers.</p>
            </div>
          </div>
        )}
      </div>

      {isWizardOpen && (
        <CampaignWizard 
          onClose={() => setIsWizardOpen(false)} 
          onLaunch={fetchCampaigns}
        />
      )}
    </div>
  );
}
