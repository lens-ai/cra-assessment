# Firebase Setup Guide

This guide will help you set up Firebase Firestore to persist CRA assessment data and enable shareable report links.

## Why Firebase?

✅ **Free tier**: 50K reads/day, 20K writes/day
✅ **No backend required** - works entirely from browser
✅ **Persistent storage** - assessments saved permanently
✅ **Shareable links** - Each report gets unique URL
✅ **Simple setup** - ~10 minutes

---

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Enter project name (e.g., `cra-assessment`)
4. Disable Google Analytics (not needed for this use case)
5. Click **Create project**

---

## Step 2: Create Firestore Database

1. In Firebase Console, click **Firestore Database** in left menu
2. Click **Create database**
3. Choose **Start in production mode**
4. Select your region (choose closest to your users, e.g., `us-central1` or `europe-west1`)
5. Click **Enable**

---

## Step 3: Configure Security Rules

1. Go to **Firestore Database** → **Rules** tab
2. Replace the default rules with:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Allow anyone to create new assessments
    match /assessments/{assessmentId} {
      allow create: if true;

      // Allow anyone to read assessments (for shareable links)
      allow read: if true;

      // Prevent updates and deletes (assessments are immutable)
      allow update, delete: if false;
    }
  }
}
```

3. Click **Publish**

**Security Rationale:**
- ✅ **create**: Allows users to save their assessments
- ✅ **read**: Allows sharing links with anyone
- ❌ **update/delete**: Assessments are immutable (audit trail)

---

## Step 4: Get Firebase Configuration

1. In Firebase Console, click the **gear icon** (⚙️) → **Project settings**
2. Scroll down to **Your apps** section
3. Click the **Web icon** (`</>`) to add a web app
4. Enter app nickname (e.g., `cra-assessment-web`)
5. **Do NOT** check "Firebase Hosting"
6. Click **Register app**
7. Copy the `firebaseConfig` object:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "cra-assessment.firebaseapp.com",
  projectId: "cra-assessment",
  storageBucket: "cra-assessment.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

---

## Step 5: Configure Environment Variables

### For Local Development:

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your Firebase values:
   ```bash
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=AIzaSy...
   VITE_FIREBASE_AUTH_DOMAIN=cra-assessment.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=cra-assessment
   VITE_FIREBASE_STORAGE_BUCKET=cra-assessment.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

3. Restart dev server:
   ```bash
   npm run dev
   ```

### For GitHub Pages Deployment:

Add Firebase secrets to your GitHub repository using `gh` CLI:

```bash
# Set Firebase API Key
gh secret set VITE_FIREBASE_API_KEY --body "AIzaSy..."

# Set Firebase Auth Domain
gh secret set VITE_FIREBASE_AUTH_DOMAIN --body "cra-assessment.firebaseapp.com"

# Set Firebase Project ID
gh secret set VITE_FIREBASE_PROJECT_ID --body "cra-assessment"

# Set Firebase Storage Bucket
gh secret set VITE_FIREBASE_STORAGE_BUCKET --body "cra-assessment.appspot.com"

# Set Firebase Messaging Sender ID
gh secret set VITE_FIREBASE_MESSAGING_SENDER_ID --body "123456789"

# Set Firebase App ID
gh secret set VITE_FIREBASE_APP_ID --body "1:123456789:web:abc123"
```

**Or set them interactively:**
```bash
gh secret set VITE_FIREBASE_API_KEY
# (paste value when prompted)
```

**Verify secrets:**
```bash
gh secret list
```

You should see all EmailJS + Firebase secrets listed.

---

## Step 6: Test Locally

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Complete a CRA assessment
3. Fill out the lead capture form
4. Check browser console for:
   ```
   Assessment saved with ID: abc123xyz
   ```

5. Check Firestore Console:
   - Go to **Firestore Database** → **Data** tab
   - You should see `assessments` collection with your saved assessment

---

## Step 7: Test Shareable Links

1. Complete an assessment and submit lead form
2. Copy the report URL from the email (should include `?report=abc123xyz`)
3. Open the URL in an incognito window
4. Verify the full report loads with all data

---

## Data Structure

Each assessment is saved with this structure:

```javascript
{
  id: "auto-generated-id",
  createdAt: Timestamp,
  version: "1.0",

  lead: {
    name: "Jane Smith",
    email: "jane@example.com",
    company: "MedDevice Inc.",
    role: "VP Engineering",
    device: "Class II SaMD"
  },

  config: {
    sector: "healthcare",
    productType: "samd"
  },

  answers: {
    mainAns: { a1: 4, a2: 3, ... },
    subAns: { a1_s1: 5, a1_s2: 4, ... },
    notes: { a1: "Note text...", ... }
  },

  scores: {
    overall: 67,
    questions: { a1: 75, a2: 60, ... },
    questionsAnswered: 18,
    totalQuestions: 22
  },

  metadata: {
    sectorLabel: "Healthcare / MedTech",
    productTypeLabel: "Pure Software (SaMD)",
    submittedAt: "2026-02-12T10:30:00.000Z"
  }
}
```

---

## URL Format

### New Assessment:
```
https://yoursite.com/
```

### Shared Report:
```
https://yoursite.com/?report=abc123xyz
```

When a user visits a shared link:
1. App detects `?report=` parameter
2. Loads assessment from Firestore
3. Restores all state (answers, scores, lead info)
4. Shows results page directly

---

## Troubleshooting

### "Firebase not initialized" Error

**Cause:** Missing environment variables

**Fix:**
1. Check `.env` file exists and has all 6 Firebase variables
2. Restart dev server after creating `.env`
3. For production, verify GitHub secrets are set:
   ```bash
   gh secret list
   ```

### "Permission denied" Error

**Cause:** Firestore security rules too restrictive

**Fix:**
1. Go to Firestore Console → Rules
2. Verify rules allow `create` and `read` for `/assessments/{id}`
3. Click **Publish** if you made changes

### Assessment Not Loading from Shared Link

**Cause:** Invalid assessment ID or deleted document

**Fix:**
1. Check Firestore Console → Data tab
2. Verify the assessment ID exists
3. Check browser console for specific error
4. Ensure security rules allow `read`

### "Assessment not found" Error

**Possible causes:**
- Invalid/expired link
- Assessment was deleted from Firestore
- Firestore rules blocking read access

**Fix:**
- Verify assessment exists in Firestore Console
- Check security rules allow read access
- Try creating a new assessment

---

## Free Tier Limits

Firebase free tier ("Spark Plan") includes:

| Resource | Limit | Sufficient For |
|----------|-------|----------------|
| **Stored data** | 1 GB | ~1 million assessments |
| **Document reads** | 50,000/day | ~1,600 shared link views/day |
| **Document writes** | 20,000/day | ~650 submissions/day |
| **Document deletes** | 20,000/day | N/A (we don't delete) |
| **Network egress** | 10 GB/month | ~300K shared link views/month |

For a lead capture tool with ~10-20 submissions/day, free tier is **more than enough**.

---

## Querying Your Data

### View All Submissions

In Firestore Console:
1. Go to **Firestore Database** → **Data**
2. Click `assessments` collection
3. Browse all submissions

### Export Data

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Export to JSON
firebase firestore:export gs://your-bucket/exports/$(date +%Y%m%d)
```

### Query Example (if you build admin panel)

```javascript
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

// Get assessments from last 7 days
const q = query(
  collection(db, 'assessments'),
  where('createdAt', '>=', new Date(Date.now() - 7*24*60*60*1000)),
  orderBy('createdAt', 'desc')
);

const snapshot = await getDocs(q);
snapshot.forEach(doc => {
  console.log(doc.id, doc.data());
});
```

---

## Privacy & GDPR Considerations

**Data stored:**
- User-provided: name, email, company, role, product
- Assessment: sector, product type, scores, answers
- Metadata: timestamp, IP not stored

**User rights:**
- **Right to access**: Provide shareable link
- **Right to deletion**: Manual deletion from Firestore Console or build admin panel

**Recommendations:**
1. Add privacy policy link on lead capture form
2. Inform users data is stored for report generation
3. Provide email contact for deletion requests
4. Consider auto-deletion after X months (requires Cloud Function on paid plan)

---

## Optional: Setup Firestore Indexes

For better performance when querying (not needed for basic usage):

1. Go to **Firestore Database** → **Indexes**
2. Add composite index:
   - Collection: `assessments`
   - Fields: `createdAt` (Descending), `metadata.sectorLabel` (Ascending)
3. Click **Create index**

---

## Next Steps

✅ Firebase configured
✅ Assessments persist with shareable links
✅ Email includes permanent report URL

**Optional enhancements:**
1. Build admin dashboard to view all submissions
2. Add analytics (e.g., which sectors submit most)
3. Export to CSV functionality
4. Auto-email report PDF to user

---

## Support

**Firebase Issues:**
- [Firebase Documentation](https://firebase.google.com/docs/firestore)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)

**Security Rules:**
- [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Rules Playground](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
