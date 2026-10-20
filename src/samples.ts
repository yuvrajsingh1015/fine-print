import type { Lang } from "./rules";

export interface Sample {
  id: string;
  label: Record<Lang, string>;
  text: string;
}

// Invented example texts. Any similarity to real companies is unintended.
export const SAMPLES: Sample[] = [
  {
    id: "gym",
    label: { en: "Gym contract (German)", de: "Fitnessstudio-Vertrag" },
    text: `Mitgliedschaftsvertrag – FitPunkt Musterstadt GmbH

§ 1 Leistungen
Das Mitglied darf alle Trainingsflächen während der Öffnungszeiten nutzen. Kurse sind im Beitrag enthalten, soweit Plätze frei sind.

§ 2 Laufzeit und Kündigung
Die Mindestlaufzeit beträgt 24 Monate ab Vertragsbeginn. Der Vertrag verlängert sich automatisch um jeweils weitere 12 Monate, wenn er nicht fristgerecht gekündigt wird. Die Kündigungsfrist beträgt drei Monate zum Ende der jeweiligen Laufzeit. Die Kündigung bedarf der Textform.

§ 3 Beiträge
Der monatliche Beitrag beträgt 39,90 €. Zusätzlich wird eine einmalige Aufnahmegebühr von 49 € sowie eine Servicepauschale von 19,90 € pro Halbjahr fällig. Der Betreiber ist berechtigt, die Beiträge einmal jährlich anzupassen. Für jede Rücklastschrift berechnen wir eine Bearbeitungsgebühr von 15 €.

§ 4 Haftung
Der Betreiber übernimmt keine Haftung für Wertgegenstände und Garderobe. Im Übrigen haften wir nicht für Schäden, die auf leichter Fahrlässigkeit beruhen.

§ 5 Hausordnung
Bei groben Verstößen gegen die Hausordnung kann der Betreiber den Vertrag fristlos kündigen und den Zugang sperren.

§ 6 Datenschutz
Zur Abwicklung der Zahlungen werden Ihre Daten an unseren Zahlungsdienstleister weitergegeben. Mit Ihrer Einwilligung nutzen wir Ihre E-Mail-Adresse zu Werbezwecken.

§ 7 Schlussbestimmungen
Gerichtsstand ist, soweit gesetzlich zulässig, Musterstadt.`,
  },
  {
    id: "phone",
    label: { en: "Phone contract", de: "Handyvertrag (Englisch)" },
    text: `Mobile Service Agreement – Example Mobile Ltd.

1. Term
This agreement has a minimum term of 24 months starting on the activation date. After the minimum term, the agreement is extended by one month at a time and will automatically renew until you cancel.

2. Cancellation
You must give at least 30 days' notice before the end of the minimum term. If you cancel during the minimum term, an early termination fee equal to the remaining monthly charges applies.

3. Charges
The monthly charge is £18.50. We may increase our prices once per year by up to 5 % plus inflation. A late fee of £7 is charged for each missed payment.

4. Your information
We may share your personal information with credit reference agencies and with third parties who help us provide the service. We use cookies and similar technologies on our website and app for analytics and personalised advertising.

5. Suspension
We may suspend or terminate your service without notice if we reasonably suspect fraud or misuse.

6. Liability
We are not liable for any loss of profit or business. Our total liability is limited to the charges you paid in the 12 months before the claim.

7. Disputes
Any dispute will be resolved by binding arbitration, and you waive the right to take part in a class action.`,
  },
  {
    id: "app",
    label: { en: "App terms of service", de: "App-Nutzungsbedingungen (Englisch)" },
    text: `Pocketlist – Terms of Service (example)

Welcome to Pocketlist. By creating an account you agree to these terms.

Subscriptions. Pocketlist Plus costs $4.99 per month. Your subscription renews automatically at the end of each billing period unless you turn off auto-renew at least 24 hours before the period ends. Prices are subject to change; we will tell you in advance.

Your content. You keep the rights to the lists you create. You grant us a worldwide licence to store and display your content so we can run the service.

Privacy. We collect usage data and device information. This information may be shared with our advertising partners and other third parties. We use analytics to understand how the app is used.

Termination. We may suspend or terminate your account at our sole discretion, for any reason or no reason, including if we believe you have violated these terms.

Disclaimer. The service is provided "as is" without warranties of any kind. In no event shall Pocketlist be liable for any indirect or consequential damages.

Governing law. These terms are governed by the laws of the State of Delaware, and the courts of Delaware have exclusive jurisdiction.`,
  },
];
