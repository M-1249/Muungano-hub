/* ============================
   UNION HUB TANZANIA - firebase-config.js
   ============================
   HATUA ZA KUWEKA DATABASE YAKO (FREE):

   1. Fungua https://co:nsole.firebase.google.com
   2. Bonyeza "Add Project" -> ipe jina "union-hub-tz" -> Create.
   3. Kwenye menu ya kushoto: "Build" -> "Authentication" -> "Get Started"
      -> Chagua "Email/Password" -> Enable -> Save.
   4. Kwenye menu: "Build" -> "Firestore Database" -> "Create Database"
      -> Chagua "Start in test mode" (kwa majaribio) -> Next -> Enable.
   5. Bonyeza ikoni ya "</>" (Web App) kwenye Project Overview kuandikisha
      app yako -> ipe jina "union-hub-web" -> Register app.
   6. Firebase itakupa "firebaseConfig" object - NAKILI thamani zako
      na uzibandike chini badala ya hizi za mfano.

   MUHIMU: Bila kufanya hatua hizi, login/register/quiz hazitafanya kazi
   kwa sababu zinahitaji database halisi ya Firebase.
   ============================ */

const firebaseConfig = {
  apiKey: "AIzaSyBURKGa_MpkZ6EKrC1uQmthncgu303nxrY",
  authDomain: "muungano-hub.firebaseapp.com",
  projectId: "muungano-hub",
  storageBucket: "muungano-hub.firebasestorage.app",
  messagingSenderId: "91759664055",
  appId: "1:91759664055:web:ef0172717cf77ca6646632"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
// Anzisha App Check kwa ajili ya reCAPTCHA v3
const appCheck = firebase.appCheck();
appCheck.activate('6Lf_vEgtAAAAAEf4lDBv6idyfTa9GowJRj4zSMIx', true);
