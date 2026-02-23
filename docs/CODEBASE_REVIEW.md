# Codebase review (IT)

## Panoramica del codebase

- Progetto Astro statico (SSG) che pubblica una vetrina di integrazioni HACS, con dataset locale in JSON e UI filtrabile lato client.
- La logica di dominio è separata in:
  - `src/lib/score-model.ts` per il modello di scoring/confidence.
  - `src/scripts/catalog-core.ts` per funzioni pure di filtro, ordinamento e serializzazione dello stato in query string.
  - `src/scripts/catalog.ts` per orchestrazione DOM, worker e interazioni utente.
- I dati HACS vengono caricati da `src/data/hacs/*.json` e aggiornati via script (`npm run sync:hacs`).
- Test unitari presenti per helpers base-path, score model e catalog core.

## Criticità osservate

1. **Assenza di validazione “a range” per i filtri numerici da URL**  
   In `queryToState` i valori numerici (`stars`, `updated`, `confidence`) sono validati solo come numeri `>= 0`, senza limiti superiori o coerzione a valori supportati dalla UI. Query anomale possono produrre stati incoerenti con i select del frontend.

2. **Messaggistica UI poco consistente sul compare**  
   Nel rendering delle card, lo stato del bottone compare mostra la label `In compare`, formulazione poco naturale e meno chiara per utenti non tecnici.

3. **Disallineamento documentazione/stato URL**  
   Il README documenta i parametri query del catalogo ma non menziona il parametro `compare`, che invece è gestito in `catalog.ts`.

4. **Copertura test incompleta su edge-case parsing URL**  
   I test del catalogo coprono i flussi principali, ma non verificano edge case come `stars=999999999`, `confidence=101`, `updated=abc`, o sort non valido in combinazione con altri parametri.

## Attività proposte

### 1) Attività per correggere un refuso (copy/UI)
- **Titolo**: Uniformare la label del compare button.
- **Intervento**: sostituire la stringa `In compare` con `In comparison` (oppure `Selected`) in `createCard`.
- **Criterio di accettazione**: quando un elemento è selezionato per confronto, il bottone mostra una label grammaticalmente corretta e coerente con il resto della UI.

### 2) Attività per correggere un bug
- **Titolo**: Hardening di `queryToState` con clamp ai range supportati.
- **Intervento**:
  - limitare `confidence` a `0..100`;
  - limitare `updated` ai valori previsti dai preset/select (es. `0/7/30/90/180/365` o comunque max definito);
  - limitare `stars` a un range ragionevole e normalizzare i NaN.
- **Criterio di accettazione**: query string malformate o estreme non mandano la UI in stato incoerente e producono sempre uno stato valido.

### 3) Attività per correggere documentazione/commento
- **Titolo**: Aggiornare README sui parametri URL reali del catalogo.
- **Intervento**: nel paragrafo sullo stato URL aggiungere il parametro `compare` (fino a 3 slug) e descrivere il comportamento di deduplica/capping.
- **Criterio di accettazione**: la sezione documentazione URL riflette esattamente i parametri supportati dal codice.

### 4) Attività per migliorare un test
- **Titolo**: Estendere `catalog.test.ts` con test parametrici sugli edge-case query.
- **Intervento**:
  - aggiungere casi tabellari per input URL invalidi o fuori range;
  - verificare fallback su default per `sort` invalido;
  - verificare normalizzazione dei numerici.
- **Criterio di accettazione**: nuovi test verdi e copertura aumentata delle condizioni limite di parsing stato.
