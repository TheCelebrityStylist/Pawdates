# Tailtend interaction audit

The automated source of record is `tests/e2e/final-ship.spec.js`; its deployed-preview run records video and trace.

| Screen | Element | Action | Required result |
|---|---|---|---|
| Landing | Navigation and CTA links | Click | Correct anchor or route loads |
| Landing | Demo completion button | Click | Stamp appears and next date changes |
| Login/signup/forgot | Forms and auth links | Submit/click | Navigation or friendly inline status |
| Onboarding 1 | Species buttons | Click, Enter, Space | `aria-pressed=true` and health ring |
| Onboarding 1 | Continue | Click | Disabled until name and species; step 2 loads |
| Onboarding 2 | Treatment buttons | Click | Selection and date field toggle |
| Onboarding 3 | Lead chips and email toggle | Click | Pressed/checked state changes |
| Onboarding 3 | Start the record | Click | Populated dashboard loads |
| Dashboard | Mark as done | Click | Stamp and rescheduled confirmation |
| Dashboard | Add pet / Unlock Premium | Click | Contextual paywall opens |
| Paywall | Plan cards / checkout / dismiss | Click | Selection, Stripe URL, or closed dialog |
| Settings | Calendar/export/billing | Click | Action starts or friendly response |
| Settings | Sign out | Click | Login loads |

The current product renders no add/edit-pet, add/edit-treatment, or pet-detail controls outside onboarding, so there are no dead links masquerading as those screens.
