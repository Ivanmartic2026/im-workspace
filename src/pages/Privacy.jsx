import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center">
            <Shield className="h-6 w-6 text-white dark:text-slate-900" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Integritetspolicy</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">IM Workspace</p>
          </div>
        </div>

        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-6 space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Översikt</h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                IM Workspace är en intern arbetsplatsapplikation för medarbetare. Vi tar din integritet på allvar 
                och denna policy förklarar hur vi samlar in, använder och skyddar din information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Information vi samlar in</h2>
              <div className="space-y-3 text-slate-700 dark:text-slate-300">
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Profilinformation</h3>
                  <p className="leading-relaxed">Namn, e-postadress, telefonnummer, avdelning, jobbtitel och profilbild.</p>
                </div>
                
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Tidrapportering</h3>
                  <p className="leading-relaxed">
                    Arbetstider, in- och utstämplingsstider, projektallokering, pauser och GPS-position 
                    vid stämplingsstillfällen (för arbetsplatsverifiering).
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Fordonsdata</h3>
                  <p className="leading-relaxed">
                    Fordonsinformation, körsträcka, tankningar, underhåll, GPS-positioner för tjänstefordon 
                    (endast under arbetstid) och körjournal.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Kommunikation</h3>
                  <p className="leading-relaxed">
                    Meddelanden i appens chatt, kommentarer på nyheter och dokumentbekräftelser.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Hur vi använder informationen</h2>
              <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                <li>Tidrapportering och löneutbetalning</li>
                <li>Projektuppföljning och resursplanering</li>
                <li>Fordonshantering och körjournal</li>
                <li>Kommunikation mellan medarbetare och ledning</li>
                <li>Dokumenthantering och onboarding</li>
                <li>Systemadministration och support</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">GPS och platsdata</h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                GPS-data samlas in endast när du aktivt använder tidrapportering eller kör ett tjänstefordon. 
                Platsinformation används för:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                <li>Verifiering av arbetsplats vid in- och utstämpling</li>
                <li>Automatisk körjournal för tjänstefordon</li>
                <li>Milers&auml;ttningsberäkning</li>
              </ul>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed mt-3">
                Du kan när som helst neka platsåtkomst i enhetens inställningar, men vissa funktioner 
                kan då vara begränsade.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Datadelning</h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Din information delas endast inom organisationen med behöriga personer (chefer, HR, administratörer). 
                Vi säljer aldrig din data till tredje part. Externa tjänster som används:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300 mt-3">
                <li>GalaGPS för fordonspositionering (endast tjänstefordon)</li>
                <li>OpenStreetMap för adressöversättning</li>
                <li>Base44 för datalagring och backend</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Datasäkerhet</h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Vi använder branschstandard för säkerhet inklusive kryptering, säker autentisering och 
                regelbundna säkerhetskopior. Endast behöriga medarbetare har åtkomst till personlig information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Dina rättigheter</h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                Enligt GDPR har du rätt att:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-700 dark:text-slate-300">
                <li>Se vilken information vi har om dig</li>
                <li>Rätta felaktig information</li>
                <li>Begära radering av dina uppgifter</li>
                <li>Exportera din data</li>
                <li>Återkalla samtycken</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Datalagring</h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Vi behåller din information så länge du är anställd och i enlighet med lag och 
                bokföringsregler därefter (vanligtvis 7 år för lönedata).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Push-notiser</h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Du kan när som helst aktivera eller inaktivera push-notiser i appens inställningar. 
                Vi skickar endast notiser relaterade till arbete (tidrapportering, meddelanden, godkännanden).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Ändringar i policyn</h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Vi kan uppdatera denna integritetspolicy. Väsentliga ändringar meddelas via appen eller e-post.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Kontakt</h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                För frågor om integritet och GDPR, kontakta:
              </p>
              <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-slate-900 dark:text-white font-semibold">ImVision AB</p>
                <p className="text-slate-700 dark:text-slate-300">E-post: info@imvision.se</p>
                <p className="text-slate-700 dark:text-slate-300">Senast uppdaterad: 6 februari 2026</p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}