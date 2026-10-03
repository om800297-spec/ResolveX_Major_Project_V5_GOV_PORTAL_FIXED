# ResolveX Major Project v4

**ResolveX: AI-Driven Real-World Problem Detection and Resolution Platform**

This is an academic major-project prototype with a complete end-to-end workflow:

1. Demo role-based login (Citizen / Department Officer / Admin)
2. Multilingual rule-based AI classification (English, Hindi, Hinglish)
3. Severity and priority scoring
4. AI confidence score
5. Duplicate/similar complaint detection
6. Root-cause suggestion
7. Suggested department routing
8. Admin department assignment override
9. SLA tracking and overdue detection
10. Complaint lifecycle: Reported → Assigned → In Progress → Resolved → Reopened
11. Photo evidence upload and preview
12. Voice input
13. Optional latitude/longitude
14. Interactive problem map
15. Search + category/severity/status/department filters
16. Timeline/audit trail
17. Citizen feedback and rating
18. Live dashboard analytics
19. AI operational insights
20. Notifications for SLA, feedback and duplicates
21. Admin CSV export
22. 15-second dashboard refresh

## Run

Requirements: Node.js 18+

```bash
npm install
npm start
```

Open:

`http://localhost:3000`

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Citizen | citizen@resolvex.demo | citizen123 |
| Department Officer | officer@resolvex.demo | officer123 |
| Admin | admin@resolvex.demo | admin123 |

### Suggested major-project demo

**Citizen**
- Login as Citizen
- Submit: `Broken Street Light`
- Location: `College Main Gate`
- Description: `The street light near the college main gate has not been working for three days. The area becomes very dark at night.`
- Expected AI result: `Electricity → Electrical Department`
- Show priority, confidence, root cause, duplicate detection and evidence upload.

**Admin**
- Login as Admin
- Open Problem Management
- Filter by department/status/severity
- Change assigned department using the dropdown
- Show timeline, SLA and notifications
- Export CSV

**Department Officer**
- Login as Officer
- Officer can work only on complaints assigned to `Electrical Department`
- Start Work → Resolve

**Citizen**
- Return to Citizen
- Submit feedback after resolution
- If unresolved, feedback reopens the complaint

## Important academic note

The AI classification in this offline prototype is a deterministic NLP/keyword engine, not a trained ML model or external LLM. The architecture is intentionally designed so a real ML/LLM service can replace the `analyse()` function later. Photo upload is evidence handling; it is not currently computer-vision classification.

The authentication is a demo academic authentication flow and should not be treated as production security.


## V5 additions — Google Sign-In + Official Government Portals

### 1) Citizen: Sign in with Google
The Citizen login page now has **Continue with Google**.

To enable it:
1. Create a Google Cloud project.
2. Configure an OAuth 2.0 **Web application** client.
3. Add this Authorized redirect URI:
   `http://localhost:3000/auth/google/callback`
4. Copy the Client ID and Client Secret into `.env`:
   `GOOGLE_CLIENT_ID=...`
   `GOOGLE_CLIENT_SECRET=...`
5. Set `SESSION_SECRET` to a long random value.
6. Restart the server with `npm start`.

For deployment, replace the localhost callback with your deployed HTTPS callback URL.

### 2) Official government complaint links
After AI department classification, ResolveX can show official government action links.

- **MP Electricity / Bhopal Central Zone:** MPCZ portal is shown for electricity complaints.
- **MP civic/state grievances:** MP CM Helpline is shown.
- **Central Government / general public grievance:** CPGRAMS is shown.

ResolveX **does not automatically submit** a government complaint. The user clicks the official portal and completes the official submission there.

Official portals:
- https://portal.mpcz.in
- https://www.cmhelpline.mp.gov.in/
- https://www.pgportal.gov.in/

### 3) Major-project note
Google OAuth is real integration but requires your own Google OAuth credentials. Never hard-code Client Secret in frontend code or publish it to GitHub.

### V5 Fixed — Start Work button
The Problem Management buttons now use `updateStatus()` instead of `status()`.
This avoids a browser `window.status` name collision that could make the Start Work button appear unresponsive.

### V5.1 Fixed — Government Portal buttons
Official government action links are now visible:
- Immediately after submitting a complaint.
- Inside every complaint card in Problem Management.

The buttons open official portals in a new tab. ResolveX does not auto-submit the government grievance.
