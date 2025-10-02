# 🎯 VERCEL MANUAL DEPLOYMENT STEPS

## PROBLEEM GEÏDENTIFICEERD
Screenshot toont: Alle deployments gebaseerd op oude commit `5733269`
Werkelijkheid: GitHub heeft nieuwste commit `a41a645`
**Conclusie: Vercel webhook/integration is gebroken**

## DIRECTE OPLOSSING

### Optie 1: Force Redeploy (SNELST)
1. Klik op de **nieuwste deployment** (FgPrJBfwd)
2. Klik op **"Redeploy"** knop rechtsboven
3. Selecteer **"Use existing Build Cache: NO"**
4. Klik **"Redeploy"**

### Optie 2: Nieuwe Deployment Triggeren
1. Ga naar **Project Settings**
2. Ga naar **Git Integration**
3. Klik **"Disconnect"** en dan **"Connect"** opnieuw
4. Of: Klik **"Trigger Deploy"** met branch: `main`

### Optie 3: Vercel CLI (als je toegang hebt)
```bash
npx vercel --prod --force
```

## VERWACHT RESULTAAT
Na handmatige actie zou je moeten zien:
- Nieuwe deployment met commit `a41a645`
- Bundle naam: `index-DfRxtkRn-[timestamp].js`
- Status: Building → Ready

## VERIFICATIE
```bash
curl -s "https://coindepo-calculator.vercel.app/" | grep -o "index-[^.]*\.js"
```
Moet teruggeven: `index-DfRxtkRn-[timestamp].js` (NIET `index-DzbtEz4w.js`)

## STATUS
🔴 **WACHT OP HANDMATIGE VERCEL DASHBOARD ACTIE**
