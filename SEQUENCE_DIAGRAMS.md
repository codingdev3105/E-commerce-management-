# Diagrammes de Séquence - Système de Gestion de Commandes E-commerce

## Vue d'ensemble du système

Le système est composé de :
- **Frontend** : Application React (interface utilisateur)
- **Backend** : API Node.js/Express
- **Google Sheets** : Base de données (stockage des commandes)
- **Noest API** : Service de livraison externe

---

## 1. Flux d'Authentification

```mermaid
sequenceDiagram
    actor User as Utilisateur
    participant UI as Frontend (React)
    participant API as Backend API
    participant GS as Google Sheets

    User->>UI: Entre code d'accès
    UI->>API: POST /api/auth/login {code}
    API->>GS: Recherche compte dans sheet 'compte'
    GS-->>API: Retourne {code, role}
    
    alt Code valide
        API->>API: Génère JWT token
        API-->>UI: {success: true, token, role}
        UI->>UI: Stocke token + role (localStorage)
        UI-->>User: Redirection vers /AjouterCommande
    else Code invalide
        API-->>UI: {success: false, message}
        UI-->>User: Affiche erreur
    end
```

---

## 2. Flux de Création de Commande

```mermaid
sequenceDiagram
    actor User as Utilisateur
    participant UI as AddOrderPage
    participant AppData as AppDataContext
    participant API as Backend API
    participant GS as Google Sheets

    User->>UI: Ouvre page "Ajouter Commande"
    
    UI->>AppData: Demande données de référence
    AppData->>API: GET /api/references
    API->>GS: Batch get (wilayas, communes, stations)
    GS-->>API: Retourne données
    API-->>AppData: {wilayas[], communes[], stations[]}
    AppData-->>UI: Données disponibles

    UI->>API: GET /api/commandes
    API->>GS: Récupère dernière référence
    GS-->>API: Dernière commande
    API-->>UI: Liste commandes
    UI->>UI: Génère prochaine référence auto

    User->>UI: Remplit formulaire (client, phone, phone2, etc.)
    User->>UI: Sélectionne wilaya
    UI->>UI: Filtre communes/stations selon wilaya
    
    User->>UI: Clic "CONFIRMER"
    UI->>API: POST /api/commandes {orderData}
    
    API->>API: Format phone avec zéro initial
    API->>API: Construit row[] avec tous les champs
    API->>GS: Append row (valueInputOption: RAW)
    GS-->>API: Success
    
    API-->>UI: {success: true, reference}
    UI-->>User: Toast "Commande ajoutée ✓"
    UI->>UI: Incrémente référence pour prochaine
    UI->>UI: Reset formulaire
```

---

## 3. Flux de Modification de Commande

```mermaid
sequenceDiagram
    actor User as Utilisateur
    participant List as OrdersListPage
    participant Edit as EditOrderPage
    participant API as Backend API
    participant GS as Google Sheets

    User->>List: Clic sur bouton "Modifier"
    List->>Edit: Navigate to /edit/:rowId

    Edit->>API: GET /api/commandes
    API->>GS: Récupère toutes les commandes (sheet = role)
    GS-->>API: Retourne rows[]
    API-->>Edit: Liste commandes
    Edit->>Edit: Trouve commande par rowId
    Edit->>Edit: Remplit formulaire

    alt État = "System"
        Edit-->>User: Champs verrouillés
        Note over Edit: Seul l'état peut être changé vers "Annuler"
    else État != "System"
        User->>Edit: Modifie champs (client, phone, phone2, etc.)
        User->>Edit: Clic "ENREGISTRER"
        Edit->>API: PUT /api/commandes/:rowId {updatedData}
        
        API->>GS: Récupère row actuelle
        GS-->>API: Current row
        API->>API: Préserve tracking si transition d'état
        API->>API: Format phones avec zéro
        API->>GS: Update row (valueInputOption: RAW)
        GS-->>API: Success
        
        API-->>Edit: {success: true}
        Edit-->>User: Toast "Modifié ✓"
        Edit->>List: Retour à la liste
    end
```

---

## 4. Flux d'Envoi vers Noest Express

```mermaid
sequenceDiagram
    actor User as Utilisateur
    participant List as OrdersListPage
    participant API as Backend API
    participant GS as Google Sheets
    participant Noest as Noest API

    User->>List: Clic bouton "Envoyer" (avion)
    List->>List: Affiche confirmation
    User->>List: Confirme envoi

    List->>API: POST /api/noest/send {rowId}
    
    API->>GS: Récupère commande (sheet = role)
    GS-->>API: Order row
    
    API->>API: Extrait données commande
    API->>API: Valide champs obligatoires
    API->>API: Format phone (ajoute 0 si manquant)
    
    alt isStopDesk = true
        API->>API: commune = '', station_code requis
    else isStopDesk = false
        API->>API: commune requis
    end
    
    API->>Noest: POST /create/order {noestOrderData}
    
    alt Succès Noest
        Noest-->>API: {success: true, tracking, reference}
        API->>GS: Update row[0]='System', row[18]=tracking
        GS-->>API: Updated
        API-->>List: {success: true, tracking}
        List-->>User: Toast "Envoyé! Tracking: XXX"
        List->>List: Refresh liste
    else Erreur Noest
        Noest-->>API: {success: false, message}
        API-->>List: Erreur
        List-->>User: Toast erreur
    end
```

---

## 5. Flux de Suivi Noest (Tracking)

```mermaid
sequenceDiagram
    actor User as Utilisateur
    participant Track as NoestTrackingPage
    participant API as Backend API
    participant GS as Google Sheets
    participant Noest as Noest API

    User->>Track: Ouvre page "Noest"
    
    Track->>API: GET /api/commandes
    API->>GS: Récupère toutes commandes
    GS-->>API: Toutes les rows
    API-->>Track: Liste complète
    
    Track->>Track: Filtre commandes avec état "System"
    Track->>Track: Extrait trackings[]
    
    Track->>API: POST /api/noest/trackings/info {trackingsArray}
    API->>Noest: POST /get/trackings/info {trackings[]}
    Noest-->>API: {tracking1: {OrderInfo, activity[], deliveryAttempts[]}, ...}
    API-->>Track: Données de suivi complètes
    
    Track->>Track: Parse dates et trie activités
    Track->>Track: Détermine catégorie (Uploadé, Validé, En Livraison, etc.)
    Track->>Track: Affiche par onglets
    
    User->>Track: Clic sur onglet (ex: "En Livraison")
    Track->>Track: Filtre et affiche commandes de cet onglet
    
    User->>Track: Clic "Historique" sur une commande
    Track->>Track: Affiche modal avec chronologie complète
    Track-->>User: Affiche activités + tentatives de livraison
    
    User->>Track: Clic "Actualiser" ↻
    Track->>Track: Recommence le flux complet
```

---

## 6. Flux d'Export PDF

```mermaid
sequenceDiagram
    actor User as Utilisateur
    participant List as OrdersListPage
    participant Export as exportService
    participant PDF as jsPDF
    participant Font as Cairo Font

    User->>List: Clic "Exporter Nouvelles (PDF)"
    List->>List: Filtre commandes état = "Nouvelle"
    
    alt Aucune commande nouvelle
        List-->>User: Toast erreur
    else Commandes trouvées
        List->>Export: exportToPDF(newOrders[], filename, role)
        
        Export->>PDF: Créer document PDF
        Export->>PDF: Ajouter font Cairo (support arabe)
        Export->>PDF: setFont('Cairo')
        
        loop Pour chaque commande
            Export->>PDF: Ajouter ligne commande
            Note over Export,PDF: Ref, Client, Phone-Phone2, Adresse, Montant
        end
        
        Export->>PDF: Ajouter totaux et résumé
        PDF-->>Export: Document généré
        Export->>Export: pdf.save(filename)
        Export-->>List: Téléchargement lancé
        List-->>User: Toast "Export réussi!"
        
        List->>List: Demande confirmation
        User->>List: Confirme "Passer à Atelier"
        
        loop Pour chaque commande exportée
            List->>API: PUT /api/commandes/:id {state: 'Atelier'}
            API->>GS: Update row
        end
        
        List->>List: Refresh liste
    end
```

---

## 7. Flux de Suppression de Commande

```mermaid
sequenceDiagram
    actor User as Utilisateur
    participant List as OrdersListPage
    participant API as Backend API
    participant GS as Google Sheets

    User->>List: Clic bouton "Supprimer" (poubelle)
    List->>List: Affiche confirmation
    User->>List: Confirme suppression

    List->>API: DELETE /api/commandes/:rowId
    
    API->>API: Parse rowId (index 1-based)
    API->>GS: getSheetIdByName(sheetName=role)
    GS-->>API: sheetId
    
    API->>GS: batchUpdate deleteDimension
    Note over API,GS: startIndex = rowId - 1<br/>endIndex = rowId
    GS-->>API: Row deleted
    
    API-->>List: {success: true}
    List->>List: Remove from local state
    List->>List: Remove from selection
    List-->>User: Toast "Supprimée ✓"
```

---

## 8. Architecture Globale du Système

```mermaid
graph TB
    subgraph "Frontend - React"
        UI[Pages UI]
        Context[Contexts<br/>AppData, States, UI]
        Services[Services<br/>api.js, exportService]
    end
    
    subgraph "Backend - Node.js/Express"
        Routes[Routes]
        Controllers[Controllers<br/>Order, Auth, Noest]
        Middleware[Auth Middleware<br/>JWT Verification]
        GSService[Google Sheet Service]
        NoestService[Noest Service]
    end
    
    subgraph "External Services"
        GSheets[(Google Sheets<br/>Stockage)]
        NoestAPI[Noest Express API<br/>Livraison]
    end
    
    UI --> Context
    Context --> Services
    Services -->|HTTP + JWT| Routes
    Routes --> Middleware
    Middleware --> Controllers
    Controllers --> GSService
    Controllers --> NoestService
    GSService -->|Google Sheets API| GSheets
    NoestService -->|REST API| NoestAPI
```

---

## 9. Flux de Données - Gestion d'État

```mermaid
stateDiagram-v2
    [*] --> Nouvelle: Création commande
    Nouvelle --> Atelier: Export PDF confirmé
    Atelier --> System: Envoi vers Noest
    System --> Livré: Livraison réussie (Noest)
    System --> Suspendu: Problème livraison
    System --> Retour: Retour expéditeur
    Suspendu --> System: Nouvelle tentative
    Nouvelle --> Annuler: Annulation manuelle
    Atelier --> Annuler: Annulation manuelle
    System --> Annuler: Annulation via UI
    Annuler --> Nouvelle: Réactivation
    Livré --> [*]
    Retour --> [*]
```

---

## Notes Techniques Importantes

### Authentification
- JWT stocké dans `localStorage`
- Middleware vérifie token sur chaque requête protégée
- Role utilisé pour déterminer la feuille Google Sheets

### Stockage Google Sheets
- **valueInputOption: RAW** utilisé pour préserver zéros initiaux des téléphones
- Chaque role a sa propre feuille
- Structure: 19 colonnes (A-S)
- Format phones: `'0676343038` (avec apostrophe dans le formatage)

### Intégration Noest
- Création commande → reçoit tracking number
- État automatiquement changé à "System"
- Tracking stocké en colonne S
- Si transition System → autre état, tracking effacé

### Format Téléphone
- Frontend: input text, validation 10 chiffres max
- Backend: formatage pour garantir zéro initial
- Google Sheets: RAW préserve le format exact
- Noest API: envoi avec zéro (`0676343038`)
- Display: `phone - phone2` si phone2 existe
