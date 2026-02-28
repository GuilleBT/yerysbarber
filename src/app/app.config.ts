import { ApplicationConfig, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { MAT_DATE_LOCALE } from '@angular/material/core';

registerLocaleData(localeEs, 'es');

const firebaseConfig = {
  apiKey: "AIzaSyAyDK9dnzkKXkOASvSkh4HGHwqGH4-lvk4",
  authDomain: "yerysbarber.firebaseapp.com",
  projectId: "yerysbarber",
  storageBucket: "yerysbarber.firebasestorage.app",
  messagingSenderId: "643914939712",
  appId: "1:643914939712:web:7287a7703e3857b8448ea5"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: LOCALE_ID, useValue: 'es' },
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' },
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore())
  ]
};