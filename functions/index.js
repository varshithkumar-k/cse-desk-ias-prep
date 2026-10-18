const { initializeApp } = require("firebase-admin/app");
const { defineSecret, defineString } = require("firebase-functions/params");
const { HttpsError, onCall } = require("firebase-functions/v2/https");

initializeApp();

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const MAIL_FROM = defineString("MAIL_FROM");
const allowedExamNames = new Set(["Polity foundation sampler", "UPSC Prelims 2026 GS-I practice", "Daily Exam Pulse"]);

exports.sendExamResultEmail = onCall({
  region: "asia-south1",
  enforceAppCheck: true,
  secrets: [RESEND_API_KEY]
}, async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in before emailing a result.");

  const email = request.auth.token.email;
  if (request.auth.token.email_verified !== true || typeof email !== "string") {
    throw new HttpsError("failed-precondition", "Use a verified email sign-in before requesting result delivery.");
  }

  const data = request.data || {};
  const examName = allowedExamNames.has(data.examName) ? data.examName : null;
  const questionCount = Number(data.questionCount);
  const correct = Number(data.correct);
  const incorrect = Number(data.incorrect);
  const total = Number(data.total);
  const submittedScore = Number(data.score);
  const numericFieldsValid = [questionCount, correct, incorrect, total, submittedScore].every(Number.isFinite);
  if (!examName || !numericFieldsValid || !Number.isInteger(questionCount) || questionCount < 1 || questionCount > 100 ||
      !Number.isInteger(correct) || !Number.isInteger(incorrect) || correct < 0 || incorrect < 0 || correct + incorrect > questionCount ||
      total !== questionCount * 2 || submittedScore < 0 || submittedScore > total) {
    throw new HttpsError("invalid-argument", "The result summary is not valid.");
  }

  const expectedScore = Math.max(0, Math.round((correct * 2 - incorrect * 0.66) * 100) / 100);
  if (submittedScore !== expectedScore) throw new HttpsError("invalid-argument", "The score does not match the submitted answer counts.");

  const from = MAIL_FROM.value();
  if (!from || !RESEND_API_KEY.value()) throw new HttpsError("failed-precondition", "Email delivery has not been configured by the site owner.");

  const accuracy = Math.round((correct / questionCount) * 100);
  const completedAt = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata"
  }).format(new Date());
  const subject = `Your CSE Desk result: ${examName}`;
  const text = [
    `Your ${examName} is complete.`,
    "",
    `Score: ${submittedScore} / ${total}`,
    `Correct: ${correct}`,
    `Incorrect: ${incorrect}`,
    `Unanswered: ${questionCount - correct - incorrect}`,
    `Accuracy: ${accuracy}%`,
    `Completed: ${completedAt}`,
    "",
    "Review the explanations in CSE Desk. This independent study tool is not affiliated with UPSC."
  ].join("\n");
  const html = `<main style="font-family:Arial,sans-serif;color:#18252b;line-height:1.6"><h1 style="font-size:22px">Your ${examName} result</h1><p>Your practice test is complete.</p><table style="border-collapse:collapse"><tbody><tr><td style="padding:6px 18px 6px 0">Score</td><td><strong>${submittedScore} / ${total}</strong></td></tr><tr><td style="padding:6px 18px 6px 0">Correct</td><td>${correct}</td></tr><tr><td style="padding:6px 18px 6px 0">Incorrect</td><td>${incorrect}</td></tr><tr><td style="padding:6px 18px 6px 0">Unanswered</td><td>${questionCount - correct - incorrect}</td></tr><tr><td style="padding:6px 18px 6px 0">Accuracy</td><td>${accuracy}%</td></tr><tr><td style="padding:6px 18px 6px 0">Completed</td><td>${completedAt} IST</td></tr></tbody></table><p>Review the explanations in CSE Desk. This independent study tool is not affiliated with UPSC.</p></main>`;

  let response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY.value()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to: [email], subject, text, html })
    });
  } catch (error) {
    console.error("Result email provider request failed", error);
    throw new HttpsError("unavailable", "The email provider could not be reached. Try again later.");
  }

  if (!response.ok) {
    console.error("Result email provider rejected the request", response.status);
    throw new HttpsError("unavailable", "The result email could not be delivered. Try again later.");
  }
  return { sent: true };
});
