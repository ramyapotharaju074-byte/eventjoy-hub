<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture
- Salesforce is the system of record for events (Campaign), ticket sales (Opportunity, Closed Won, linked to the Campaign) and support requests (Case); all Salesforce calls go through `src/lib/salesforce.server.ts` from server functions only — keeps connector keys off the browser.
- Lovable Cloud holds accounts, roles (`user_roles`), event extras Salesforce lacks (venue, price, capacity, category), order receipts and reviews — standard Salesforce objects have no fields for these.
- Ticket prices and totals are always recomputed on the server from stored event data — the browser total is display-only.
