# CRM Webhook Integration Guide

## For All 3 Website Repos: DPL, VCS, BSL

### Step 1: Add the helper file to each website repo

Create `src/lib/crm-webhook.ts` (or `lib/crm-webhook.ts` depending on repo structure):

```typescript
// src/lib/crm-webhook.ts
// Forward form submissions to FU Corp CRM for lead tracking

export async function forwardToCRM(data: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  service?: string;
  budget?: string;
  message?: string;
  source: 'DPL' | 'VCS' | 'BSL';
  formType: 'chatbot' | 'audit' | 'contact' | 'support' | 'newsletter' | 'founder';
  qualityScore?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}) {
  const url = process.env.CRM_WEBHOOK_URL || 'https://fu-corp-crm.vercel.app/api/webhook/lead';
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // Non-blocking — website form must not fail if CRM is down
  }
}
```

### Step 2: Add env var to each website's Vercel project

```
CRM_WEBHOOK_URL=https://fu-corp-crm.vercel.app/api/webhook/lead
```

(Optional — the helper has a hardcoded fallback, but env var is cleaner)

---

## DPL (Digital Point LLC) — digitalpointllc.com
**Repo:** `UMIDX124/DIGITALPOINTLLC.1`

### Route: `/api/leads/route.ts` (ChatLead)
After the ChatLead upsert/create, add:
```typescript
import { forwardToCRM } from '@/lib/crm-webhook';

// ... after local save ...
forwardToCRM({
  name: name || 'Unknown',
  email,
  phone: phone || '',
  company: company || '',
  service: interest || '',
  budget: '0',
  message: conversationSummary || '',
  source: 'DPL',
  formType: 'chatbot',
  qualityScore: qualityScore || 0,
});
```

### Route: Contact/Founder form route
```typescript
import { forwardToCRM } from '@/lib/crm-webhook';

// ... after local save ...
forwardToCRM({
  name: data.name,
  email: data.email,
  phone: data.phone || '',
  company: data.company || '',
  message: data.message || '',
  source: 'DPL',
  formType: 'founder', // or 'contact'
});
```

### Route: Audit submission route
```typescript
import { forwardToCRM } from '@/lib/crm-webhook';

// ... after local save ...
forwardToCRM({
  name: data.name || data.contactName || '',
  email: data.email,
  company: data.company || data.website || '',
  service: 'Website Audit',
  source: 'DPL',
  formType: 'audit',
});
```

---

## VCS (Virtual Customer Solution) — virtualcustomersolution.com
**Repo:** `UMIDX124/VirtualCustomerSolutions`

### Route: `/api/contact/route.ts`
```typescript
import { forwardToCRM } from '@/lib/crm-webhook';

// ... after local save ...
forwardToCRM({
  name: data.name,
  email: data.email,
  phone: data.phone || '',
  message: data.message || '',
  source: 'VCS',
  formType: 'contact',
});
```

### Route: `/api/audit/route.ts`
```typescript
import { forwardToCRM } from '@/lib/crm-webhook';

// ... after local save ...
forwardToCRM({
  name: data.name || '',
  email: data.email,
  company: data.company || data.website || '',
  service: 'Website Audit',
  source: 'VCS',
  formType: 'audit',
});
```

### Route: `/api/chat/route.ts` (if ChatLead exists)
```typescript
import { forwardToCRM } from '@/lib/crm-webhook';

// ... after local save ...
forwardToCRM({
  name: name || 'Unknown',
  email,
  company: company || '',
  service: interest || '',
  message: summary || '',
  source: 'VCS',
  formType: 'chatbot',
  qualityScore: score || 0,
});
```

---

## BSL (Backup Solutions LLC) — backup-solutions.vercel.app
**Repo:** `UMIDX124/BackupSolutions`

**NOTE:** BSL uses an in-memory database. All data is lost on every deploy.
The CRM webhook is especially important here — it's the ONLY persistent storage for BSL leads.

### Route: `/api/contact/route.ts`
```typescript
import { forwardToCRM } from '@/lib/crm-webhook';

// ... after local save (or even before, since local save is ephemeral) ...
forwardToCRM({
  name: data.name,
  email: data.email,
  phone: data.phone || '',
  message: data.message || '',
  source: 'BSL',
  formType: 'contact',
});
```

### Route: `/api/audit/route.ts`
```typescript
import { forwardToCRM } from '@/lib/crm-webhook';

// ... after local save ...
forwardToCRM({
  name: data.name || '',
  email: data.email,
  company: data.company || data.website || '',
  service: 'Security Audit',
  source: 'BSL',
  formType: 'audit',
});
```

---

## CRM Webhook Response Format

The CRM webhook returns:
```json
{
  "success": true,
  "leadId": "cmxyz123...",
  "lead": {
    "company": "Acme Corp",
    "priority": "HIGH",
    "score": 72,
    "assignedRep": "faizan"
  }
}
```

## Scoring Breakdown

The CRM auto-scores every lead:
- Budget signal: 0-40 pts ($20K+ = 40, $10K+ = 30, $5K+ = 20, $1K+ = 10)
- Contact quality: 0-20 pts (business email = 10, has company = 10)
- Engagement: 0-20 pts (chatbot = 20, audit = 15, contact = 10, newsletter = 5)
- Service match: 0-10 pts (marketing/dev/AI = 10, security = 7)
- Attribution: 0-10 pts (referral = 10, organic = 7, paid = 5, direct = 3)

Priority mapping: 80+ = URGENT, 60+ = HIGH, 40+ = MEDIUM, <40 = LOW
