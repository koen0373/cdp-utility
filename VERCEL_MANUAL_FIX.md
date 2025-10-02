# VERCEL DEPLOYMENT FIX - MANUAL STAPPEN

## Probleem
Vercel serveert nog steeds oude bundle `index-DzbtEz4w.js` ondanks meerdere commits.
Laatste commit: `bacb1bd` wordt niet opgepikt door Vercel.

## DIRECTE OPLOSSING - Voer deze stappen uit:

### Stap 1: Ga naar je Vercel Project Dashboard
1. Ga naar https://vercel.com/dashboard
2. Klik op je `coindepo-calculator` project

### Stap 2: Force Redeploy
1. Ga naar de "Deployments" tab
2. Klik op de laatste deployment
3. Klik op de "..." (drie puntjes) rechts
4. Selecteer "Redeploy" 
5. **BELANGRIJK**: Zorg dat "Use existing Build Cache" UITSTAAT
6. Klik "Redeploy"

### Stap 3: Als dat niet werkt - Git Integration Reset
1. Ga naar "Settings" tab van je project
2. Scroll naar "Git Integration"
3. Klik "Disconnect" bij GitHub
4. Klik "Connect Git Repository" 
5. Selecteer opnieuw je `cdp-utility` repository
6. Zorg dat branch op `main` staat

### Stap 4: Vercel Build Settings Controleren
1. Ga naar "Settings" > "General"
2. Controleer:
   - Framework Preset: `Vite`
   - Build Command: `npm run vercel-build`
   - Output Directory: `dist`
   - Install Command: `npm ci`

### Stap 5: Environment Variables (optioneel)
1. Ga naar "Settings" > "Environment Variables"
2. Voeg toe: `VITE_BUILD_TIME` = `force-rebuild-$(date +%s)`

## Verificatie
Na redeploy, controleer of nieuwe bundle wordt geserveerd:
```bash
curl -s "https://coindepo-calculator.vercel.app/" | grep -o 'index-[^"]*\.js'
```

Verwacht: Een nieuwe hash, NIET `index-DzbtEz4w.js`

## Als NIETS werkt - Nuclear Option
1. Delete het hele Vercel project
2. Import opnieuw vanaf GitHub
3. Gebruik de build settings hierboven

## Huidige Status
- ✅ Code is correct gepusht naar GitHub
- ✅ Vercel configuratie is geoptimaliseerd  
- ❌ Vercel pikt wijzigingen niet op (webhook issue)
- 🎯 **ACTIE VEREIST**: Manual redeploy via Vercel dashboard
