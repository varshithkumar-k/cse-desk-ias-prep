import { firebaseConfig, appCheckSiteKey } from "./firebase-config.js";

const SDK = "https://www.gstatic.com/firebasejs/13.0.0/";
let contextPromise;

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig?.apiKey && firebaseConfig?.authDomain && firebaseConfig?.projectId && firebaseConfig?.appId);
}

export function isAppCheckConfigured() {
  return Boolean(appCheckSiteKey);
}

export async function getFirebaseContext() {
  if (!isFirebaseConfigured()) throw new Error("Firebase is not configured yet. Add the public web config in assets/firebase-config.js.");
  if (!contextPromise) contextPromise = (async () => {
    const [{ initializeApp }, authSdk, appCheckSdk, functionsSdk, firestoreSdk] = await Promise.all([
      import(`${SDK}firebase-app.js`),
      import(`${SDK}firebase-auth.js`),
      import(`${SDK}firebase-app-check.js`),
      import(`${SDK}firebase-functions.js`),
      import(`${SDK}firebase-firestore.js`)
    ]);
    const app = initializeApp(firebaseConfig);
    const auth = authSdk.getAuth(app);
    await authSdk.setPersistence(auth, authSdk.browserLocalPersistence);
    let appCheck = null;
    if (appCheckSiteKey) {
      appCheck = appCheckSdk.initializeAppCheck(app, {
        provider: new appCheckSdk.ReCaptchaEnterpriseProvider(appCheckSiteKey),
        isTokenAutoRefreshEnabled: true
      });
    }
    const db = firestoreSdk.getFirestore(app, "cse-desk-user-data");
    return { app, auth, authSdk, appCheck, appCheckSdk, functionsSdk, firestoreSdk, db };
  })();
  return contextPromise;
}

export async function sendEmailSignInLink(email) {
  const { auth, authSdk } = await getFirebaseContext();
  const root = document.documentElement.dataset.root || "./";
  const continueUrl = new URL(`${root}account/`, location.href);
  const requestedReturn = new URLSearchParams(location.search).get("return");
  if (requestedReturn) {
    const destination = new URL(requestedReturn, location.origin);
    const appRoot = new URL(root, location.href);
    if (destination.origin === location.origin &&
        destination.pathname.startsWith(appRoot.pathname) &&
        !destination.pathname.startsWith(`${appRoot.pathname}account/`)) {
      continueUrl.searchParams.set("return", `${destination.pathname}${destination.search}${destination.hash}`);
    }
  }
  const actionCodeSettings = {
    url: continueUrl.href,
    handleCodeInApp: true
  };
  await authSdk.sendSignInLinkToEmail(auth, email, actionCodeSettings);
  localStorage.setItem("csedesk-signin-email", email);
}

export async function completeEmailLinkSignIn(email, url = location.href) {
  const { auth, authSdk } = await getFirebaseContext();
  if (!authSdk.isSignInWithEmailLink(auth, url)) throw new Error("This link is not a valid sign-in link.");
  const credential = await authSdk.signInWithEmailLink(auth, email, url);
  localStorage.removeItem("csedesk-signin-email");
  return credential.user;
}

export async function observeAuth(callback) {
  const { auth, authSdk } = await getFirebaseContext();
  return authSdk.onAuthStateChanged(auth, callback);
}

export async function signOutUser() {
  const { auth, authSdk } = await getFirebaseContext();
  await authSdk.signOut(auth);
}

export async function saveExamAttempt(result) {
  const { auth, db, firestoreSdk } = await getFirebaseContext();
  const user = auth.currentUser;
  if (!user || !user.emailVerified) throw new Error("Sign in with your verified email before saving a result.");
  const attempt = {
    examName: String(result.examName || "").slice(0, 80),
    testName: String(result.testName || result.examName || "").slice(0, 80),
    score: Number(result.score),
    total: Number(result.total),
    correct: Number(result.correct),
    incorrect: Number(result.incorrect),
    questionCount: Number(result.questionCount),
    percentage: Number(result.percentage),
    createdAt: firestoreSdk.serverTimestamp()
  };
  const ref = await firestoreSdk.addDoc(
    firestoreSdk.collection(db, "users", user.uid, "attempts"),
    attempt
  );
  return { ...attempt, id: ref.id, createdAt: new Date() };
}

export async function loadExamAttempts() {
  const { auth, db, firestoreSdk } = await getFirebaseContext();
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return [];
  const attemptsRef = firestoreSdk.collection(db, "users", user.uid, "attempts");
  const recent = firestoreSdk.query(
    attemptsRef,
    firestoreSdk.orderBy("createdAt", "desc"),
    firestoreSdk.limit(50)
  );
  const snapshot = await firestoreSdk.getDocs(recent);
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function emailTestResult(result) {
  const { app, auth, appCheck, appCheckSdk, functionsSdk } = await getFirebaseContext();
  if (!appCheck) throw new Error("Result email security is not fully configured. Add the App Check site key before enabling email delivery.");
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before emailing a result.");
  await user.getIdToken(true);
  if (!user.emailVerified) throw new Error("Sign in with your verified email link before emailing a result.");
  await appCheckSdk.getToken(appCheck, true);
  const functions = functionsSdk.getFunctions(app, "asia-south1");
  const send = functionsSdk.httpsCallable(functions, "sendExamResultEmail");
  return send(result);
}
