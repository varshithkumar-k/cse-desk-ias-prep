import {
  completeEmailLinkSignIn,
  getFirebaseContext,
  isAppCheckConfigured,
  isFirebaseConfigured,
  observeAuth,
  sendEmailSignInLink,
  signOutUser
} from "./firebase-client.js?v=20261017-1";

const form = document.querySelector("[data-signin-form]");
const emailField = document.querySelector("[name=email]");
const status = document.querySelector("[data-auth-status]");
const accountView = document.querySelector("[data-account-view]");
const signInView = document.querySelector("[data-signin-view]");
const configNote = document.querySelector("[data-config-note]");
const autoEmail = document.querySelector("[data-auto-email]");
let currentUser = null;

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = `notice auth-status ${kind}`.trim();
}

autoEmail.addEventListener("change", () => {
  if (currentUser) localStorage.setItem(`csedesk-email-results:${currentUser.uid}`, String(autoEmail.checked));
  document.querySelector("[data-email-preference-status]").textContent = autoEmail.checked
    ? "Automatic result emails are on for this account in this browser."
    : "Automatic result emails are off.";
});

document.querySelector("[data-signout]").addEventListener("click", async () => {
  try { await signOutUser(); setStatus("You are signed out."); }
  catch (error) { setStatus(error.message, "error"); }
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  const email = emailField.value.trim();
  if (!email) return;
  form.querySelector("button").disabled = true;
  setStatus("Sending a secure sign-in link…");
  try {
    await sendEmailSignInLink(email);
    setStatus(`Check ${email} for your sign-in link. Opening it here verifies your email address.`);
  } catch (error) {
    setStatus(error.message || "Could not send the sign-in link.", "error");
  } finally {
    form.querySelector("button").disabled = false;
  }
});

async function finishEmailLink() {
  const params = new URLSearchParams(location.search);
  const savedEmail = localStorage.getItem("csedesk-signin-email") || "";
  const isLink = params.has("oobCode") || location.href.includes("mode=signIn");
  if (!isLink) return;
  const email = savedEmail || window.prompt("Enter the email address where you received this sign-in link:") || "";
  if (!email) return;
  setStatus("Verifying your sign-in link…");
  try {
    await completeEmailLinkSignIn(email);
    history.replaceState({}, document.title, location.pathname);
    setStatus("Email verified. You are signed in.", "success");
    const returnPath = params.get("return");
    if (returnPath) {
      const destination = new URL(returnPath, location.origin);
      const appRoot = new URL(document.documentElement.dataset.root || "./", location.href);
      if (destination.origin === location.origin && destination.pathname.startsWith(appRoot.pathname) && !destination.pathname.startsWith(`${appRoot.pathname}account/`)) {
        location.replace(destination.href);
      }
    }
  } catch (error) {
    setStatus(error.message || "This sign-in link could not be verified. Request a new one.", "error");
  }
}

async function init() {
  if (!isFirebaseConfigured()) {
    configNote.hidden = false;
    form.querySelectorAll("input, button").forEach(control => { control.disabled = true; });
    setStatus("Account sign-in will be available after Firebase is configured.");
    return;
  }
  try {
    const appCheckReady = isAppCheckConfigured();
    await getFirebaseContext();
    configNote.hidden = appCheckReady;
    if (!appCheckReady) {
      configNote.querySelector("strong").textContent = "Email delivery needs App Check setup.";
      configNote.querySelector("p").textContent = "Email-link sign-in is ready. Add your reCAPTCHA Enterprise site key in assets/firebase-config.js, then deploy the result-email function to enable email delivery.";
      setStatus("Email-link sign-in is available. Configure the App Check site key before enabling result emails.");
      autoEmail.disabled = true;
    }
    await finishEmailLink();
    await observeAuth(user => {
      if (!user) {
        currentUser = null;
        autoEmail.checked = false;
        autoEmail.disabled = !appCheckReady;
        document.querySelector("[data-email-preference-status]").textContent = "Automatic result emails are off.";
        accountView.hidden = true;
        signInView.hidden = false;
        return;
      }
      currentUser = user;
      autoEmail.checked = localStorage.getItem(`csedesk-email-results:${user.uid}`) === "true";
      autoEmail.disabled = !appCheckReady || !user.emailVerified;
      document.querySelector("[data-email-preference-status]").textContent = autoEmail.checked
        ? "Automatic result emails are on for this account in this browser."
        : "Automatic result emails are off.";
      accountView.hidden = false;
      signInView.hidden = true;
      document.querySelector("[data-user-email]").textContent = user.email || "Signed-in user";
      document.querySelector("[data-user-email-detail]").textContent = user.email || "Signed-in user";
      document.querySelector("[data-verification-state]").textContent = user.emailVerified
        ? "Verified email"
        : "Email verification is still required";
      document.querySelector("[data-profile-mark]").textContent = (user.email || "S").slice(0, 1).toUpperCase();
      setStatus(user.emailVerified ? "You are signed in with a verified email." : "Verify your email before requesting result delivery.", user.emailVerified ? "success" : "");
    });
  } catch (error) {
    setStatus(error.message || "Unable to initialize sign-in.", "error");
  }
}

init();
