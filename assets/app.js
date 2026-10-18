(() => {
  const root = document.documentElement.dataset.root || "";
  const qs = (selector, parent = document) => parent.querySelector(selector);
  const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  let signedInUser = null;
  let authReady = false;
  let resolveAuthReady;
  const authReadyPromise = new Promise(resolve => { resolveAuthReady = resolve; });
  let accountAttempts = [];
  let progressLoadError = "";
  const readStats = () => {
    const attempts = accountAttempts;
    const latest = attempts[0] || {};
    const best = attempts.reduce((current, attempt) => {
      const currentRate = current?.total ? current.score / current.total : -1;
      const attemptRate = attempt.total ? attempt.score / attempt.total : -1;
      return attemptRate > currentRate ? attempt : current;
    }, null);
    return {
      tests: attempts.length,
      lastScore: latest.score,
      lastTotal: latest.total,
      lastCorrect: latest.correct,
      lastQuestionCount: latest.questionCount,
      lastTest: latest.testName || latest.examName,
      lastDate: latest.createdAt?.toDate?.().toISOString().slice(0, 10) || latest.createdAt?.toISOString?.().slice(0, 10),
      bestScore: best?.score,
      bestTotal: best?.total
    };
  };
  const saveStats = async result => {
    const firebaseClientUrl = new URL(`${root}assets/firebase-client.js?v=20261017-1`, location.href).href;
    const { saveExamAttempt } = await import(firebaseClientUrl);
    const saved = await saveExamAttempt(result);
    accountAttempts.unshift(saved);
    accountAttempts = accountAttempts.slice(0, 50);
    return saved;
  };
  const legacyQuestions = [
    {
      text: "The provisions relating to Fundamental Rights are contained in which part of the Constitution of India?",
      options: ["Part II", "Part III", "Part IV", "Part IVA"], answer: 1,
      explanation: "Fundamental Rights are set out in Part III of the Constitution, Articles 12 to 35."
    },
    {
      text: "Which authority certifies whether a bill is a Money Bill in the Lok Sabha?",
      options: ["The President of India", "The Union Finance Minister", "The Speaker of the Lok Sabha", "The Chairperson of the Rajya Sabha"], answer: 2,
      explanation: "Article 110(3) provides that the Speaker of the Lok Sabha decides whether a bill is a Money Bill."
    },
    {
      text: "Fundamental Duties were added to the Constitution by which amendment?",
      options: ["24th Amendment", "42nd Amendment", "44th Amendment", "52nd Amendment"], answer: 1,
      explanation: "The 42nd Constitutional Amendment Act, 1976 added Fundamental Duties as Part IVA."
    },
    {
      text: "A Proclamation of National Emergency is provided for under which article?",
      options: ["Article 324", "Article 352", "Article 356", "Article 360"], answer: 1,
      explanation: "Article 352 deals with a Proclamation of Emergency on the grounds specified in the Constitution."
    },
    {
      text: "Which article gives the Supreme Court original jurisdiction in certain disputes between the Union and states?",
      options: ["Article 32", "Article 131", "Article 136", "Article 143"], answer: 1,
      explanation: "Article 131 gives the Supreme Court original jurisdiction in specified federal disputes."
    }
  ];
  const legacyPulseQuestions = [
    { text: "Under Article 280, how often is the Finance Commission ordinarily constituted?", options: ["Every three years", "Every five years or earlier", "Every six years", "Only when Parliament requests it"], answer: 1, explanation: "Article 280 directs the President to constitute a Finance Commission at the expiration of every fifth year, or earlier if considered necessary." },
    { text: "Which statement best describes the Directive Principles of State Policy?", options: ["They are enforceable by courts like Fundamental Rights", "They are not enforceable by courts but are fundamental in governance", "They apply only during a National Emergency", "They are listed in Part IVA"], answer: 1, explanation: "Article 37 says the Directive Principles are not enforceable by any court, while declaring them fundamental in the governance of the country." },
    { text: "The Eleventh Schedule of the Constitution is associated with which institution?", options: ["Municipalities", "Panchayats", "Co-operative societies", "Union Territories"], answer: 1, explanation: "The Eleventh Schedule lists matters that may be devolved to Panchayats under Part IX." },
    { text: "A quorum to constitute a meeting of either House of Parliament is what fraction of its total membership?", options: ["One-twentieth", "One-tenth", "One-sixth", "One-third"], answer: 1, explanation: "Article 100(3) sets the quorum at one-tenth of the total number of members of the House, unless Parliament provides otherwise by law." },
    { text: "Disqualification on the ground of defection is primarily provided in which Schedule?", options: ["Eighth Schedule", "Ninth Schedule", "Tenth Schedule", "Twelfth Schedule"], answer: 2, explanation: "The Tenth Schedule contains the anti-defection provisions, added by the 52nd Constitutional Amendment." },
    { text: "When the Lok Sabha passes a Money Bill, for how long may the Rajya Sabha keep it before returning recommendations?", options: ["7 days", "14 days", "30 days", "It has no time limit"], answer: 1, explanation: "Under Article 109, the Rajya Sabha must return a Money Bill with recommendations within 14 days; the Lok Sabha may accept or reject them." },
    { text: "Which subject is listed in the State List in the Seventh Schedule?", options: ["Defence of India", "Public order", "Citizenship", "Inter-State trade"], answer: 1, explanation: "Public order is Entry 1 of the State List. The Constitution separately places police in Entry 2 of that List." },
    { text: "Which pair of conditions is used to identify a biodiversity hotspot?", options: ["High rainfall and at least 100 bird species", "At least 1,500 endemic vascular plant species and major habitat loss", "A large protected area and a high tiger population", "At least 10,000 flowering plants and no invasive species"], answer: 1, explanation: "A region qualifies as a biodiversity hotspot if it has at least 1,500 endemic vascular plant species and has lost at least 70% of its original natural vegetation." },
    { text: "The Ramsar Convention is principally concerned with the conservation and wise use of what?", options: ["Desert ecosystems", "Wetlands", "Mountain glaciers", "Coral minerals"], answer: 1, explanation: "The Convention on Wetlands was adopted in Ramsar, Iran, in 1971 and provides a framework for wetland conservation and wise use." },
    { text: "How many Indian states does the Tropic of Cancer pass through?", options: ["Six", "Seven", "Eight", "Nine"], answer: 2, explanation: "It crosses Gujarat, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand, West Bengal, Tripura and Mizoram." },
    { text: "In the context of Indian soils, what is the usual distinction between Bhangar and Khadar?", options: ["Bhangar is newer alluvium; Khadar is older alluvium", "Bhangar is older alluvium; Khadar is newer alluvium", "Bhangar is black soil; Khadar is laterite soil", "Both are varieties of desert soil"], answer: 1, explanation: "Bhangar refers to older alluvial deposits, generally on higher terraces; Khadar refers to newer alluvium renewed by floods." },
    { text: "India’s flexible inflation-targeting framework uses which price index as its inflation measure?", options: ["Wholesale Price Index", "Consumer Price Index (Combined)", "GDP deflator alone", "Index of Industrial Production"], answer: 1, explanation: "The RBI Act framework specifies the Consumer Price Index (Combined) as the measure for the inflation target." },
    { text: "El Niño refers to periodic abnormal warming of which region?", options: ["Western Indian Ocean", "Central and eastern equatorial Pacific Ocean", "North Atlantic Ocean", "Southern Ocean near Antarctica"], answer: 1, explanation: "El Niño is the warm phase of ENSO, involving abnormal warming of the central and eastern equatorial Pacific. Its effects on the Indian monsoon are influences, not certainties." },
    { text: "Which constitutional article provides for the Goods and Services Tax Council?", options: ["Article 263", "Article 279A", "Article 280", "Article 324"], answer: 1, explanation: "Article 279A provides for the GST Council and identifies its members and functions." },
    { text: "Which statement about a constitutional amendment under Article 368 is correct?", options: ["Every amendment needs a national referendum", "Some amendments also require ratification by at least half of the states", "The President may amend the Constitution by ordinance", "A simple majority in both Houses is always sufficient"], answer: 1, explanation: "Amendments affecting specified federal provisions require ratification by the legislatures of not less than one-half of the states, in addition to the prescribed parliamentary majority." },
    { text: "Under which article may a Governor promulgate an Ordinance when the state legislature is not in session?", options: ["Article 123", "Article 213", "Article 249", "Article 356"], answer: 1, explanation: "Article 213 empowers a Governor to promulgate an Ordinance when the state legislature is not in session, subject to constitutional conditions." },
    { text: "Which Constitutional Amendment Act gave constitutional status to Panchayati Raj institutions?", options: ["42nd", "52nd", "73rd", "74th"], answer: 2, explanation: "The 73rd Amendment inserted Part IX and the Eleventh Schedule for Panchayats. The 74th Amendment concerns municipalities." },
    { text: "Which description of a mangrove ecosystem is most accurate?", options: ["A salt-tolerant forest in intertidal coastal zones", "A freshwater grassland on high plateaus", "A conifer forest above the tree line", "A coral reef ecosystem"], answer: 0, explanation: "Mangroves are salt-tolerant trees and shrubs adapted to intertidal coastal environments, especially sheltered tropical and subtropical shorelines." },
    { text: "The National Emergency provision is found in which article of the Constitution?", options: ["Article 352", "Article 356", "Article 360", "Article 368"], answer: 0, explanation: "Article 352 provides for a Proclamation of Emergency on the constitutionally specified grounds." },
    { text: "Which statement best describes a carbon sink?", options: ["A system that emits more carbon than it absorbs", "A reservoir that absorbs more carbon than it releases over a period", "A source of only naturally occurring methane", "A technology that measures ocean salinity"], answer: 1, explanation: "A carbon sink removes and stores more carbon than it releases over a given period; forests and oceans can function as sinks." }
  ];

  const questions = [
    {
      text: "With reference to punch-marked coins used in ancient India, consider the following statements:\n1. Symbols were generally impressed on pieces of metal rather than cast as a single portrait design.\n2. Silver examples were widely used, and copper examples are also known.\n3. Their recurring symbols by themselves prove that a single central authority issued every specimen.\nWhich of the statements given above are correct?",
      options: ["1 and 2 only", "2 and 3 only", "1 and 3 only", "1, 2 and 3"], answer: 0,
      explanation: "Punch-marked coins carry symbols impressed separately on metal pieces; silver examples are common and copper examples are also known. Similar marks and standards alone do not establish that every coin came from one central issuer.",
      reference: "Style reference: UPSC CSE Prelims GS-I 2026. Original practice question; not verbatim."
    },
    {
      text: "Consider the following statements about Indian temple architecture:\n1. A curvilinear shikhara over the sanctum is characteristic of the Nagara tradition.\n2. A tiered, pyramidal vimana is commonly associated with the Dravida tradition.\n3. A monumental gopuram is the defining tower of the Nagara tradition.\nWhich of the statements given above are correct?",
      options: ["1 and 2 only", "2 and 3 only", "1 and 3 only", "1, 2 and 3"], answer: 0,
      explanation: "Nagara temples commonly have a curvilinear shikhara over the sanctum. Dravida temples are associated with a tiered vimana, while monumental gopurams are gateway towers especially associated with southern temple complexes.",
      reference: "Style reference: UPSC CSE Prelims GS-I 2026. Original practice question; not verbatim."
    },
    {
      text: "With reference to the four gatis in Jain thought, consider the following statements:\n1. They include celestial, human, animal/plant and infernal states of existence.\n2. Yakshas constitute a separate fifth gati.\nWhich of the statements given above is/are correct?",
      options: ["1 only", "2 only", "Both 1 and 2", "Neither 1 nor 2"], answer: 0,
      explanation: "The four gatis are celestial, human, animal/plant and infernal existence. Yakshas appear in Jain traditions as attendant or guardian beings, not as a separate fifth gati.",
      reference: "Style reference: UPSC CSE Prelims GS-I 2026. Original practice question; not verbatim."
    },
    {
      text: "Consider the following statements about wetlands designated under the Ramsar Convention:\n1. A Ramsar designation automatically converts a wetland into a national park under Indian law.\n2. The Convention promotes the conservation and wise use of wetlands.\n3. A wetland can be designated for its international importance, including its representativeness or uniqueness.\nWhich of the statements given above are correct?",
      options: ["1 and 2 only", "2 and 3 only", "1 and 3 only", "1, 2 and 3"], answer: 1,
      explanation: "Ramsar designation recognises a wetland's international importance and supports conservation and wise use. It does not automatically change the site's legal status to a national park under Indian law.",
      reference: "Style reference: UPSC CSE Prelims GS-I 2026. Original practice question; not verbatim."
    },
    {
      text: "Consider the following statements about the decimal place-value system:\n1. The position of a digit affects its value.\n2. Zero can serve as a placeholder that distinguishes values such as 25 and 205.\n3. Every symbol has the same value regardless of where it appears.\nWhich of the statements given above are correct?",
      options: ["1 and 2 only", "2 and 3 only", "1 and 3 only", "1, 2 and 3"], answer: 0,
      explanation: "In a positional system, a digit's position determines its place value; zero can preserve an otherwise empty place. Statement 3 describes non-positional notation, not the decimal place-value system.",
      reference: "Style reference: UPSC CSE Prelims GS-I 2026. Original practice question; not verbatim."
    },
    {
      text: "With reference to Harappan material culture, consider the following statements:\n1. Recurring weight standards are found at multiple settlements.\n2. Such standards are consistent with shared practices of measurement and exchange.\n3. The weights alone establish that every Harappan city was ruled by one emperor.\nWhich of the statements given above are correct?",
      options: ["1 and 2 only", "2 and 3 only", "1 and 3 only", "1, 2 and 3"], answer: 0,
      explanation: "Recurring weight standards support the existence of shared measurement practices and are consistent with organised exchange. Archaeological evidence of this kind cannot, by itself, prove a single ruler or one centralised political structure.",
      reference: "Style reference: UPSC CSE Prelims GS-I 2026. Original practice question; not verbatim."
    },
    {
      text: "Consider the following statements about peasant movements in colonial India:\n1. The Bardoli Satyagraha of 1928 opposed an increase in land revenue assessment.\n2. The Eka Movement in Awadh involved peasant grievances over rents and related exactions.\n3. Both movements took place in the Bombay Presidency's Gujarat region.\nWhich of the statements given above are correct?",
      options: ["1 and 2 only", "2 and 3 only", "1 and 3 only", "1, 2 and 3"], answer: 0,
      explanation: "Bardoli Satyagraha resisted increased land revenue in Gujarat. The Eka Movement arose in Awadh, where peasants protested rents and related exactions; therefore, the two movements were not both in Gujarat.",
      reference: "Style reference: UPSC CSE Prelims GS-I 2026. Original practice question; not verbatim."
    },
    {
      text: "With reference to Treasury Bills issued by the Government of India, consider the following statements:\n1. They are short-term government securities.\n2. They are issued at a discount and redeemed at face value.\n3. They pay a periodic coupon like a conventional dated government bond.\nWhich of the statements given above are correct?",
      options: ["1 and 2 only", "2 and 3 only", "1 and 3 only", "1, 2 and 3"], answer: 0,
      explanation: "Treasury Bills are short-term Government of India securities. They are issued at a discount and redeemed at face value, so the return is the difference rather than a periodic coupon payment.",
      reference: "Style reference: UPSC CSE Prelims GS-I 2026. Original practice question; not verbatim."
    },
    {
      text: "With reference to India's flexible inflation-targeting framework, consider the following statements:\n1. Inflation for the notified target is measured using the Consumer Price Index (Combined).\n2. The Wholesale Price Index is the designated measure for that target.\nWhich of the statements given above is/are correct?",
      options: ["1 only", "2 only", "Both 1 and 2", "Neither 1 nor 2"], answer: 0,
      explanation: "The notified inflation target is expressed in terms of all-India Consumer Price Index (Combined) inflation, not Wholesale Price Index inflation.",
      reference: "Style reference: UPSC CSE Prelims GS-I 2026. Original practice question; not verbatim."
    },
    {
      text: "Consider the following statements about writ jurisdiction in India:\n1. Article 32 empowers the Supreme Court to issue writs for enforcement of Fundamental Rights.\n2. Under Article 226, a High Court may issue writs for enforcement of Fundamental Rights and for other purposes.\n3. The right to move the Supreme Court under Article 32 is itself a Fundamental Right.\nWhich of the statements given above are correct?",
      options: ["1 and 2 only", "2 and 3 only", "1 and 3 only", "1, 2 and 3"], answer: 3,
      explanation: "Article 32 provides a constitutional remedy in the Supreme Court for enforcement of Fundamental Rights, and the right to move the Court is itself a Fundamental Right. Article 226 gives High Courts writ powers for Fundamental Rights and for other purposes.",
      reference: "Style reference: UPSC CSE Prelims GS-I 2026. Original practice question; not verbatim."
    }
  ];
  const pulseQuestions = questions;

  function todayPulseSet() {
    const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
    const date = Object.fromEntries(dateParts.map(part => [part.type, part.value]));
    const indiaDay = Math.floor(Date.UTC(Number(date.year), Number(date.month) - 1, Number(date.day)) / 86400000);
    const dayIndex = indiaDay % pulseQuestions.length;
    return Array.from({ length: 10 }, (_, i) => pulseQuestions[(dayIndex + i) % pulseQuestions.length]);
  }

  function updateDashboardStats() {
    const s = readStats();
    const tests = qs("[data-stat-tests]");
    const score = qs("[data-stat-score]");
    if (tests) tests.textContent = String(s.tests || 0);
    if (score) score.textContent = s.lastScore == null ? "—" : `${s.lastScore}/${s.lastTotal || questions.length}`;
    const completed = qs("[data-progress-completed]");
    const best = qs("[data-progress-best]");
    if (completed) completed.textContent = String(s.tests || 0);
    if (best) best.textContent = s.bestScore == null ? "—" : `${s.bestScore}/${s.bestTotal || 10}`;
    const history = qs("[data-test-history]");
    if (history) {
      history.innerHTML = progressLoadError
        ? `<tr><td colspan="4" class="empty-note">${escapeHtml(progressLoadError)}</td></tr>`
        : accountAttempts.slice(0, 10).map(attempt => {
          const completedAt = attempt.createdAt?.toDate?.() || attempt.createdAt || new Date();
          const date = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(completedAt);
          const accuracy = Math.round(((attempt.correct || 0) / (attempt.questionCount || questions.length)) * 100);
          return `<tr><td>${escapeHtml(date)}</td><td>${escapeHtml(attempt.testName || attempt.examName)}</td><td>${escapeHtml(attempt.score)}/${escapeHtml(attempt.total)}</td><td>${accuracy}%</td></tr>`;
        }).join("") || `<tr><td colspan="4" class="empty-note">${signedInUser ? "No mock tests completed yet. Your first result will appear here." : "Sign in with a verified email to load your private study history."}</td></tr>`;
    }
    qsa("[data-progress-subject]").forEach(el => {
      const percent = el.dataset.progressSubject === "Polity" && s.lastTest === "Polity foundation sampler" ? Math.round(((s.lastCorrect || 0) / (s.lastQuestionCount || questions.length)) * 100) : Number(el.dataset.percent || 0);
      const bar = qs(".track span", el);
      const label = qs(".subject-value, .bar-score", el);
      if (bar) bar.style.width = `${percent}%`;
      if (label) label.textContent = `${percent}%`;
    });
  }

  function renderQuestion() {
    const target = qs("[data-daily-question]");
    if (!target) return;
    const q = questions[0];
    target.innerHTML = `<div class="question-count">Daily practice · GS Paper I</div><p class="question-text">${q.text}</p><p class="question-reference">${q.reference}</p><div class="options">${q.options.map((option, i) => `<label class="option"><input type="radio" name="daily-answer" value="${i}"><span>${option}</span></label>`).join("")}</div><div class="button-row" style="margin-top:18px"><button class="button" type="button" data-check-daily>Check answer</button></div><div data-daily-feedback aria-live="polite"></div>`;
    qs("[data-check-daily]", target)?.addEventListener("click", () => {
      const selected = qs('input[name="daily-answer"]:checked', target);
      const feedback = qs("[data-daily-feedback]", target);
      if (!selected) { feedback.innerHTML = `<div class="feedback bad">Choose an option to check your answer.</div>`; return; }
      qsa(".option", target).forEach((label, i) => {
        label.classList.toggle("is-correct", i === q.answer);
        label.classList.toggle("is-wrong", i === Number(selected.value) && i !== q.answer);
      });
      feedback.innerHTML = `<div class="feedback ${Number(selected.value) === q.answer ? "good" : "bad"}"><strong>${Number(selected.value) === q.answer ? "Correct" : "Review this one"}</strong>${q.explanation}</div>`;
    });
  }

  async function openQuiz(questionSet = questions, title = "Polity foundation · Mock test", testName = "Polity foundation sampler", durationMinutes = 10) {
    if (!authReady) await authReadyPromise;
    if (!authReady || !signedInUser) {
      const returnTo = encodeURIComponent(`${location.pathname}${location.search}${location.hash}`);
      location.assign(`${root}account/?return=${returnTo}`);
      return;
    }
    let current = 0;
    const answers = Array(questionSet.length).fill(null);
    const marked = new Set();
    let seconds = durationMinutes * 60;
    let timer;
    let completed = false;
    const overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.setAttribute("role", "presentation");
    overlay.innerHTML = `<section class="dialog" role="dialog" aria-modal="true" aria-labelledby="quiz-title"><div class="dialog-top"><div><h2 id="quiz-title">${title}</h2><p>${questionSet.length} questions · ${durationMinutes} minutes · +2 correct, −0.66 incorrect</p></div><button class="close-button" type="button" aria-label="Close test" data-close>×</button></div><div data-quiz-body></div></section>`;
    document.body.append(overlay);
    const body = qs("[data-quiz-body]", overlay);
    const formatTime = () => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    const draw = () => {
      const q = questionSet[current];
      body.innerHTML = `<div class="quiz-status"><span>Question ${current + 1} of ${questionSet.length}${marked.has(current) ? " · Marked for review" : ""}</span><span>Time left: <strong data-timer>${formatTime()}</strong></span></div><p class="quiz-question">${q.text}</p><p class="question-reference">${q.reference}</p><div class="options">${q.options.map((opt, i) => `<label class="option quiz-option"><input type="radio" name="quiz-answer" value="${i}" ${answers[current] === i ? "checked" : ""}><span>${opt}</span></label>`).join("")}</div><div class="quiz-actions"><div class="quiz-actions-group"><button class="button button-quiet" type="button" data-prev ${current === 0 ? "disabled" : ""}>Previous</button><button class="button button-quiet" type="button" data-mark>${marked.has(current) ? "Unmark" : "Mark for review"}</button></div><div class="quiz-actions-group">${current < questionSet.length - 1 ? `<button class="button" type="button" data-next>Next question</button>` : `<button class="button" type="button" data-submit>Submit test</button>`}</div></div>`;
      qs('input[name="quiz-answer"]:checked', body)?.focus({ preventScroll: true });
      qsa('input[name="quiz-answer"]', body).forEach(input => input.addEventListener("change", e => { answers[current] = Number(e.target.value); }));
      qs("[data-prev]", body)?.addEventListener("click", () => { if (current > 0) current--; draw(); });
      qs("[data-next]", body)?.addEventListener("click", () => { if (current < questionSet.length - 1) current++; draw(); });
      qs("[data-mark]", body)?.addEventListener("click", () => { marked.has(current) ? marked.delete(current) : marked.add(current); draw(); });
      qs("[data-submit]", body)?.addEventListener("click", finish);
    };
    const finish = async () => {
      clearInterval(timer);
      if (completed) return;
      completed = true;
      const correct = answers.reduce((total, value, i) => total + (value === questionSet[i].answer ? 1 : 0), 0);
      const incorrect = answers.reduce((total, value, i) => total + (value != null && value !== questionSet[i].answer ? 1 : 0), 0);
      const score = Math.max(0, Math.round((correct * 2 - incorrect * .66) * 100) / 100);
      const totalPoints = questionSet.length * 2;
      const pct = Math.round(correct / questionSet.length * 100);
      const result = { examName: testName, testName, score, total: totalPoints, correct, incorrect, questionCount: questionSet.length, percentage: pct };
      let resultSaved = false;
      try { await saveStats(result); resultSaved = true; }
      catch (error) { console.error("Could not save this account's mock result", error); }
      body.innerHTML = `<div class="score-layout"><div><div class="question-count">Test complete</div><span class="score-number">${score}<small style="font-size:15px;color:var(--muted);font-weight:500"> / ${totalPoints}</small></span><p class="score-summary">${correct} correct · ${incorrect} incorrect · ${questionSet.length - correct - incorrect} unanswered</p><p class="score-summary" role="status">${resultSaved ? "Saved to your signed-in account." : "This result is visible here but could not be saved to your account."}</p><div class="quiet-divider"></div><h3>Review and learn</h3><div class="result-list">${questionSet.map((q, i) => `<div class="result-item"><strong>${i + 1}. ${answers[i] === q.answer ? "Correct" : answers[i] == null ? "Unanswered" : "Incorrect"}</strong><p>${q.explanation}</p><p class="question-reference">${q.reference}</p><a class="text-link" href="${root}ai-study/?question=${encodeURIComponent(`${q.text}\nCorrect answer: ${q.options[q.answer]}\nExplanation: ${q.explanation}`)}">Ask an AI study partner about this question →</a></div>`).join("")}</div></div><aside class="panel panel-pad"><div class="question-count">Accuracy</div><span class="score-number">${pct}%</span><p class="score-summary">Use the explanations to choose one topic for your next revision session.</p><div class="quiet-divider"></div><div class="result-email"><strong>Email this result</strong><p data-email-status role="status">Send it to your verified sign-in email, or enable automatic delivery in Account.</p><div class="button-row"><button class="button button-secondary" type="button" data-email-result ${resultSaved ? "" : "disabled"}>Email result</button><a class="button button-quiet" href="${root}account/">Account</a></div></div><div class="quiet-divider"></div><div class="button-row"><a class="button button-secondary" href="${root}practice/">Practice a question</a><button class="button button-quiet" type="button" data-close>Done</button></div></aside></div>`;
      updateDashboardStats();
      const emailButton = qs("[data-email-result]", body);
      const emailStatus = qs("[data-email-status]", body);
      const sendResultEmail = async () => {
        emailButton.disabled = true;
        emailStatus.textContent = "Sending to your verified email…";
        try {
          const firebaseClientUrl = new URL(`${root}assets/firebase-client.js?v=20261017-1`, location.href).href;
          const { emailTestResult } = await import(firebaseClientUrl);
          await emailTestResult(result);
          emailStatus.textContent = "Result email sent.";
          emailButton.textContent = "Email sent";
        } catch (error) {
          emailStatus.textContent = error.message || "The result email could not be sent. Check Account setup and try again.";
          emailButton.disabled = false;
        }
      };
      emailButton.addEventListener("click", sendResultEmail);
      if (resultSaved && localStorage.getItem(`csedesk-email-results:${signedInUser.uid}`) === "true") sendResultEmail();
      qsa("[data-close]", overlay).forEach(btn => btn.addEventListener("click", close));
    };
    const close = () => { clearInterval(timer); overlay.remove(); };
    qs("[data-close]", overlay).addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    overlay.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    draw();
    timer = setInterval(() => {
      seconds--;
      const el = qs("[data-timer]", overlay);
      if (el) el.textContent = formatTime();
      if (seconds <= 0) finish();
    }, 1000);
  }

  function bindAi() {
    const prompt = qs("[data-ai-prompt]");
    if (!prompt) return;
    const params = new URLSearchParams(location.search);
    const question = params.get("question");
    if (question) {
      qs("[data-ai-context]").textContent = `Mock-test review context: ${question}\nDiscuss the reasoning and exam relevance.`;
      prompt.value = "Explain this question and the reasoning behind the correct answer. Add one related UPSC-style follow-up question.";
    }
    const status = qs("[data-ai-status]");
    const output = qs("[data-ai-output]");
    const buildPrompt = () => {
      const context = qs("[data-ai-context]")?.textContent?.trim() || "I am preparing for the UPSC Civil Services Examination.";
      const request = prompt.value.trim() || "Explain this topic in a concise, exam-focused way. Include relevant constitutional provisions or examples, then give me one follow-up question.";
      return `${context}\n\n${request}\n\nPlease distinguish established facts from interpretation and do not invent citations.`;
    };
    qsa("[data-provider]").forEach(button => button.addEventListener("click", async () => {
      const text = buildPrompt();
      output.textContent = text;
      const provider = button.dataset.provider;
      const url = provider === "chatgpt" ? "https://chatgpt.com/" : "https://gemini.google.com/app";
      window.open(url, "_blank", "noopener,noreferrer");
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = `Prompt copied. Paste it into ${provider === "chatgpt" ? "ChatGPT" : "Gemini"} in the new tab.`;
      } catch {
        status.textContent = "The prompt is ready below. Select and copy it, then paste it into the provider tab.";
      }
    }));
  }

  function bindStudyScene() {
    const scene = qs("[data-study-scene]");
    if (!scene || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const reset = () => {
      scene.style.setProperty("--scene-tilt-x", "0deg");
      scene.style.setProperty("--scene-tilt-y", "0deg");
    };
    scene.addEventListener("pointermove", event => {
      if (event.pointerType === "touch") return;
      const bounds = scene.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      scene.style.setProperty("--scene-tilt-x", `${(-y * 7).toFixed(2)}deg`);
      scene.style.setProperty("--scene-tilt-y", `${(x * 8).toFixed(2)}deg`);
    });
    scene.addEventListener("pointerleave", reset);
    scene.addEventListener("keydown", event => {
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(event.key)) return;
      event.preventDefault();
      if (event.key === "Home") { reset(); return; }
      const x = Number.parseFloat(scene.style.getPropertyValue("--scene-tilt-x")) || 0;
      const y = Number.parseFloat(scene.style.getPropertyValue("--scene-tilt-y")) || 0;
      scene.style.setProperty("--scene-tilt-x", `${Math.max(-9, Math.min(9, x + (event.key === "ArrowUp" ? -2 : event.key === "ArrowDown" ? 2 : 0)))}deg`);
      scene.style.setProperty("--scene-tilt-y", `${Math.max(-10, Math.min(10, y + (event.key === "ArrowLeft" ? -2 : event.key === "ArrowRight" ? 2 : 0)))}deg`);
    });
  }

  qsa("[data-start-test]").forEach(button => button.addEventListener("click", () => openQuiz(questions, "GS-I · 2026 pattern practice", "UPSC Prelims 2026 GS-I practice", 12)));
  qsa("[data-start-pulse]").forEach(button => button.addEventListener("click", () => openQuiz(todayPulseSet(), "Today’s GS-I practice · Prelims", "Daily Exam Pulse", 12)));
  const pulseDate = qs("[data-pulse-date]");
  if (pulseDate) pulseDate.textContent = `Set for ${new Intl.DateTimeFormat("en-IN", { dateStyle: "long", timeZone: "Asia/Kolkata" }).format(new Date())}`;
  renderQuestion();
  bindAi();
  bindStudyScene();
  updateDashboardStats();
  async function initializeAccountProgress() {
    const firebaseClientUrl = new URL(`${root}assets/firebase-client.js?v=20261017-1`, location.href).href;
    try {
      const { observeAuth, loadExamAttempts } = await import(firebaseClientUrl);
      await observeAuth(async user => {
        signedInUser = user?.emailVerified ? user : null;
        authReady = true;
        resolveAuthReady();
        progressLoadError = "";
        const sessionUser = qs("[data-session-user]");
        if (sessionUser) sessionUser.textContent = signedInUser?.email || "Sign in to save progress";
        accountAttempts = [];
        updateDashboardStats();
        if (signedInUser) {
          const uid = signedInUser.uid;
          try {
            const attempts = await loadExamAttempts();
            if (signedInUser?.uid === uid) accountAttempts = attempts;
          } catch (error) {
            console.error("Could not load account-scoped study progress", error);
            progressLoadError = "Sign-in is active, but study history could not be loaded. Check that Firestore is enabled.";
          }
          updateDashboardStats();
        }
      });
    } catch (error) {
      console.error("Firebase authentication could not initialize", error);
      authReady = true;
      resolveAuthReady();
      signedInUser = null;
      accountAttempts = [];
      progressLoadError = "Account sign-in could not initialize. Please open Account and check Firebase setup.";
      const sessionUser = qs("[data-session-user]");
      if (sessionUser) sessionUser.textContent = "Sign in unavailable";
      updateDashboardStats();
    }
  }
  initializeAccountProgress();
})();
