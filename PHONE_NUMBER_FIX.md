# Correction du problème du zéro initial dans les numéros de téléphone

## Problème
Les numéros de téléphone algériens commencent par 0 (ex: 0676343038), mais :
1. **Dans Google Sheets** : Le 0 initial disparaissait car les numéros étaient traités comme des nombres
2. **Dans Noest** : Les numéros étaient insérés sans le 0 (676343038 au lieu de 0676343038)

## Solution Implémentée

### 1. Backend - GoogleSheetService.js
**Changement de `valueInputOption`** :
- Modification de `USER_ENTERED` à `RAW` dans les méthodes :
  - `addRow()`
  - `updateRow()`
  - `updateTracking()`
- Avec `RAW`, Google Sheets stocke exactement ce qu'on envoie sans interpréter les valeurs
- Les zéros initiaux sont **préservés automatiquement**

```javascript
valueInputOption: 'RAW', // Use RAW to preserve leading zeros
```

### 2. Backend - OrderController.js
**Modifications dans `createOrder` et `updateOrder`** :
- Ajout d'une fonction `formatPhone()` qui s'assure que le numéro commence par 0
- Pas besoin d'apostrophe avec RAW, juste s'assurer du préfixe 0

```javascript
const formatPhone = (phoneNum) => {
    if (!phoneNum) return '';
    const cleaned = phoneNum.toString().trim();
    return cleaned.startsWith('0') ? cleaned : `0${cleaned}`;
};
```

### 3. Backend - noest.controller.js
**Modification dans `sendToNoest`** :
- Ajout d'une fonction `formatPhoneForNoest()` qui :
  - Supprime l'apostrophe si elle existe (pour compatibilité)
  - S'assure que le numéro commence toujours par 0 avant l'envoi à Noest

```javascript
const formatPhoneForNoest = (phone) => {
    if (!phone) return '';
    const cleaned = cleanStr(phone).replace(/'/g, '');
    return cleaned.startsWith('0') ? cleaned : `0${cleaned}`;
};
```

### 4. Frontend - AddOrderPage.jsx
**Déjà bien configuré** :
- Le champ input est de type "text" (pas "number")
- Validation pour accepter uniquement les chiffres
- Limite à 10 caractères maximum

## Résultat Attendu

### Dans Google Sheets :
- Les numéros seront affichés avec le 0 initial : `0676343038`
- Grâce à `valueInputOption: 'RAW'`, Google Sheets n'interprète pas les valeurs
- Plus de conversion automatique en nombre

### Dans Noest :
- Les numéros seront envoyés avec le 0 initial : `0676343038`
- Format correct pour l'API Noest

## Pourquoi RAW au lieu de USER_ENTERED ?

- **USER_ENTERED** : Google Sheets interprète les valeurs (dates, nombres, formules...)
  - `0676343038` → converti en nombre → `676343038` ❌
- **RAW** : Google Sheets stocke exactement ce qu'on envoie
  - `0676343038` → stocké tel quel → `0676343038` ✅

## Tests à Effectuer

1. **Test d'ajout de commande** :
   - Aller sur la page "Nouvelle Commande"
   - Saisir un numéro avec 0 initial (ex: 0676343038)
   - Vérifier dans Google Sheets que le 0 est bien présent
   
2. **Test d'envoi vers Noest** :
   - Envoyer une commande vers Noest
   - Vérifier dans les logs que le numéro est envoyé avec le 0
   - Vérifier dans Noest que le numéro est correct

3. **Test de modification** :
   - Modifier une commande existante
   - Vérifier que le 0 est toujours préservé
