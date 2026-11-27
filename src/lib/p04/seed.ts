/**
 * P04 seed. Built on Launchpad's three approved applications (src/lib/p02/data.ts), with dates
 * relative to the moment of seeding or reset. All people, companies and texts are synthetic.
 *
 *   PLC-001 Latifa Al Suwaidi, UX/UI Design Intern, Hikma Health Tech (app-02): ended 3 days ago, ready to grade, On track
 *   PLC-002 Rashed Al Falasi, Machine Learning Co-op, Falcon AI Labs (app-06): in progress, Watch
 *   PLC-003 Aisha Al Zaabi, Data Analyst Co-op, Aldar Digital Studio (app-13): in progress, Needs attention
 *
 * Hamad Al Blooshi (app-03, Shortlisted) has no internship. When an employer approves him in
 * Launchpad, his internship starts that day (syncPlacements).
 */
import { COMPANIES, LISTINGS } from "@/lib/p02/data";
import { FACULTY, FACULTY_ACTOR, MEET_BASE, OPEN_MEETING, createInternship, emptyState, monthOf } from "./rules";
import { addMins, at, ms, overlaps } from "./time";
import type { Actor, HrRating, Internship, Meeting, P04State, ReportContent } from "./types";

type C = Omit<ReportContent, "hours"> & { hours: number };

const LATIFA: C[] = [
  {
    workedOn:
      "I joined the patient app team and went through onboarding and the health data privacy training. I mapped the current appointment booking journey step by step and found nine screens where patients drop off. The product designer reviewed my map.",
    learned:
      "I learned how the team keeps patient data out of design files and screenshots. I also learned to use analytics funnels to see where people leave a flow.",
    challenges:
      "The booking flow has different versions for clinics and hospitals. I built one map for each and marked the differences.",
    helpNeeded: "None at the moment.",
    nextPlan: "Plan and run five short interviews with patients about booking appointments.",
    hours: 70,
  },
  {
    workedOn:
      "I planned and ran five interviews with patients and two with clinic receptionists. I grouped what they said into an affinity map. The main theme was that patients cannot see which doctor is free on which day.",
    learned:
      "I learned to ask open questions and let people show me how they use the app. I also learned to separate what people say from what they actually do.",
    challenges:
      "Two interviews were cancelled at short notice, so I booked two more people the next week.",
    helpNeeded: "I would like tips on writing up research for people who are not designers.",
    nextPlan: "Sketch three ideas for a clearer doctor and time picker and test them with the team.",
    hours: 75,
  },
  {
    workedOn:
      "I sketched three ideas for a clearer doctor and time picker and built a clickable Figma prototype of the strongest one. I tested it with five patients. Four of them booked an appointment in under a minute.",
    learned:
      "I learned to test early with rough prototypes instead of polishing one idea. I also learned to write usability test tasks that do not give away the answer.",
    challenges: "My first prototype had too many screens. The designer helped me cut it down to three.",
    helpNeeded: "None right now.",
    nextPlan: "Check the new design for accessibility, including text size and colour contrast.",
    hours: 72,
  },
  {
    workedOn:
      "I checked the new booking design for accessibility and fixed text size, colour contrast and button labels for screen readers. I also tested it with an older patient who uses large text. I logged twelve changes in the design system backlog.",
    learned:
      "I learned the basic accessibility rules for colour contrast and touch targets. I also saw how small changes help patients with weak eyesight.",
    challenges:
      "The team moved the release date forward and I focused on the design fixes first. That is why this report is two days late.",
    helpNeeded: "I would like advice on managing a report deadline when project dates move suddenly.",
    nextPlan: "Design the reminder and cancellation screens for appointments.",
    hours: 78,
  },
  {
    workedOn:
      "I designed the reminder and cancellation screens and tested them with four patients. Patients now see the clinic address and what to bring in the reminder. The product owner approved the screens for development.",
    learned:
      "I learned to write short, calm messages for patients who may be worried. I also learned how designers hand over screens to developers in Figma.",
    challenges:
      "Some reminder texts were too long for a phone lock screen. I shortened them and checked them on two phone sizes.",
    helpNeeded: "None.",
    nextPlan: "Prepare my end-of-internship presentation and write handover notes for the design team.",
    hours: 74,
  },
  {
    workedOn:
      "I presented my research and the new booking design to the product team and the clinic managers. I wrote handover notes so the team can continue the work after I leave. I also walked a new design intern through my Figma files.",
    learned:
      "I learned to present design decisions with evidence from research. I also learned how much good handover notes help the people who take over.",
    challenges:
      "Two managers asked about costs, which was outside my work. I noted their questions and passed them to the product owner.",
    helpNeeded: "None.",
    nextPlan: "Finish the handover and write a short personal reflection on the internship for my course.",
    hours: 70,
  },
];

const RASHED: C[] = [
  {
    workedOn:
      "I set up access to the team's GPU server and read the code of the current ticket-routing model. I cleaned three months of support ticket data and wrote a script that removes duplicates and empty messages. My mentor reviewed the script and I fixed two bugs.",
    learned:
      "I learned how the team splits data into training, validation and test sets by date, so the model is tested on newer tickets. I also learned why every change goes through a pull request.",
    challenges:
      "The ticket data mixed several languages, which confused me at first. I lost half a day before my mentor showed me the language tags.",
    helpNeeded: "Nothing right now. My mentor answers questions quickly.",
    nextPlan: "Train a first baseline model and set up an evaluation report the team can rerun.",
    hours: 72,
  },
  {
    workedOn:
      "I trained a baseline text classifier and built an evaluation script that reports accuracy and errors for each ticket category. The team now uses my script to compare new models. The baseline beats the current rules for most categories.",
    learned:
      "I learned to look at results for each category, not only overall accuracy, because small categories can hide behind big ones. I also learned to keep experiment settings in a config file.",
    challenges:
      "Training runs failed twice because the GPU server ran out of memory when two jobs ran together. My mentor showed me how to book GPU time. This took longer than planned, which is why this report is late.",
    helpNeeded: "I would like feedback on how much detail my reports should include.",
    nextPlan: "Try a small transformer model and compare it with the baseline on the same test set.",
    hours: 76,
  },
  {
    workedOn:
      "I fine-tuned a small transformer model and compared it with the baseline on the same test set. It improved accuracy on the three largest categories, and I wrote a short results page for the team. The team lead asked me to prepare a demo.",
    learned:
      "I learned how to fine-tune a pretrained model without overfitting by watching the validation scores. Writing the results page showed me how to explain numbers to people outside the ML team.",
    challenges:
      "Two ticket categories have very few examples, so the model mixes them up. I listed them and shared the list with my mentor.",
    helpNeeded: "I would like advice on linking this work to the learning outcomes of my course.",
    nextPlan: "Wrap the model in a small API service and test how fast it answers.",
    hours: 74,
  },
];

const AISHA: (C | null)[] = [
  {
    workedOn:
      "I met the sales and pricing teams and cleaned six months of property enquiry data from the customer system. I built my first Power BI page showing enquiries by community and unit type. My manager compared it with the team's monthly numbers.",
    learned:
      "I learned how enquiries rise after new launches and during holiday seasons. I also learned how the sales team uses these numbers to plan their week.",
    challenges:
      "Some weeks had no data because of a system change. I filled the gaps with averages and noted this in the file.",
    helpNeeded: "None right now.",
    nextPlan: "Check how well enquiries turn into viewings and move the cleaning steps into SQL.",
    hours: 70,
  },
  {
    workedOn:
      "I moved the cleaning steps into SQL and started a model that links enquiries to viewings and sales. I also helped check unit prices for a new launch. The model now covers two communities.",
    learned:
      "I learned how to write SQL that I can rerun each week. The price check showed me how small data errors change the sales picture.",
    challenges: "Updating the model takes a long time because I still do some steps by hand.",
    helpNeeded: "I need help choosing how to measure the conversion rate fairly.",
    nextPlan: "Extend the model to all communities and analyse sales by price band.",
    hours: 68,
  },
  null,
  {
    workedOn:
      "I analysed sales by price band for the last eight weeks and presented the results to the sales team. Two price bands sold much more slowly than the rest. The team agreed to test new offers in one community.",
    learned:
      "I learned how to compare communities fairly when they have very different numbers of units. I also learned to show a result with one clear chart instead of many.",
    challenges:
      "I submitted this report late because I focused on the presentation first. I also still owe the changes on Report 2.",
    helpNeeded: "I would like advice on catching up on the missing report.",
    nextPlan: "Write up the price band analysis and hand the conversion model over to the sales team.",
    hours: 64,
  },
];

const pad = (n: number) => String(n).padStart(3, "0");

export function seedP04(now: number = Date.now()): P04State {
  let s = emptyState();
  const make = (appId: string, studentId: string, listingId: string, startOff: number) => {
    const l = LISTINGS.find((x) => x.id === listingId)!;
    s = createInternship(
      s,
      { id: appId, studentId, listingId, companyId: l.companyId, duration: l.duration },
      at(now, startOff, 9),
    );
    return s.internships[s.internships.length - 1]!;
  };
  const latifa = make("app-02", "latifa", "ux-hikma", -87);
  const rashed = make("app-06", "rashed", "ml-coop-falcon", -50);
  const aisha = make("app-13", "aisha", "da-coop-aldar", -66);

  const names: Record<string, string> = {
    latifa: "Latifa Al Suwaidi",
    rashed: "Rashed Al Falasi",
    aisha: "Aisha Al Zaabi",
  };
  const student = (p: Internship): Actor => ({ role: "Student", name: names[p.studentId] ?? "", studentId: p.studentId });
  const rpt = (p: Internship, n: number) => s.reports.find((r) => r.internshipId === p.id && r.number === n)!;

  function submit(p: Internship, n: number, dayOff: number, c: C) {
    const r = rpt(p, n);
    const iso = at(now, dayOff, 18, 30);
    r.content = { ...c };
    r.attachment = n % 2 ? "" : `Report_${n}_evidence.pdf`;
    r.submittedAt = r.lastSubmittedAt = iso;
    r.late = Date.parse(at(now, dayOff, 0)) > ms(r.due);
    r.status = "Submitted";
    const by = student(p);
    r.history.push({
      from: r.late ? "Overdue" : "Due",
      to: "Submitted",
      role: by.role,
      by: by.name,
      at: iso,
      note: r.late ? "Submitted late." : "Submitted on time.",
    });
  }
  function review(p: Internship, n: number, dayOff: number, comment: string) {
    const r = rpt(p, n);
    const iso = at(now, dayOff, 11);
    r.status = "Reviewed";
    r.reviewedAt = iso;
    r.facultyComment = comment;
    r.history.push({ from: "Submitted", to: "Reviewed", role: "Faculty", by: FACULTY.name, at: iso, note: `Reviewed. Comment: ${comment}` });
  }
  function changes(p: Internship, n: number, dayOff: number, comment: string) {
    const r = rpt(p, n);
    const iso = at(now, dayOff, 11);
    r.status = "Changes requested";
    r.facultyComment = comment;
    r.history.push({ from: "Submitted", to: "Changes requested", role: "Faculty", by: FACULTY.name, at: iso, note: `Changes requested: ${comment}` });
  }
  function newSlot(start: string, status: "Free" | "Booked" = "Free") {
    s.counters.slot++;
    const id = `SLOT-${pad(s.counters.slot)}`;
    s.slots.push({ id, facultyId: FACULTY.id, start, end: addMins(start, 30), status, deleted: false });
    return id;
  }
  function meeting(p: Internship, dayOff: number, h: number, origin: Meeting["origin"], agenda: string, createdOff: number): Meeting {
    const start = at(now, dayOff, h);
    const slotId = origin === "Student request" ? newSlot(start, "Booked") : null;
    s.counters.mtg++;
    const id = `MTG-${pad(s.counters.mtg)}`;
    const by = origin === "Student request" ? student(p) : FACULTY_ACTOR;
    const answer = origin === "Student request" ? FACULTY_ACTOR : student(p);
    const first = origin === "Student request" ? "Requested" : "Invited";
    const m: Meeting = {
      id,
      internshipId: p.id,
      month: monthOf(p, start) ?? 1,
      start,
      end: addMins(start, 30),
      slotId,
      origin,
      agenda,
      status: "Scheduled",
      videoLink: MEET_BASE + id,
      reason: "",
      notes: "",
      history: [
        { from: "(new)", to: first, role: by.role, by: by.name, at: at(now, createdOff, 10), note: `${origin === "Student request" ? "Requested from a free slot." : "Invitation sent."} Agenda: ${agenda}` },
        { from: first, to: "Scheduled", role: answer.role, by: answer.name, at: at(now, createdOff + 1, 9, 30), note: "Accepted. Video link created." },
      ],
    };
    s.meetings.push(m);
    return m;
  }
  const complete = (m: Meeting, notes: string) => {
    m.status = "Completed";
    m.notes = notes;
    m.history.push({ from: "Scheduled", to: "Completed", role: "Faculty", by: FACULTY.name, at: addMins(m.start, 45), note: "Meeting completed. Notes recorded by faculty." });
  };
  const missed = (m: Meeting) => {
    m.status = "Missed";
    m.history.push({ from: "Scheduled", to: "Missed", role: "Faculty", by: FACULTY.name, at: addMins(m.start, 60), note: "Marked as missed." });
  };
  function hr(p: Internship, dayOff: number, rating: HrRating, comment: string, strengths: string, improve: string) {
    const co = COMPANIES.find((c) => c.id === p.companyId);
    s.counters.hrc++;
    s.hr.push({
      id: `HRC-${pad(s.counters.hrc)}`,
      internshipId: p.id,
      companyId: p.companyId,
      author: co?.hr ?? "Workplace supervisor",
      rating,
      comment,
      strengths,
      improve,
      at: at(now, dayOff, 16),
    });
  }

  // PLC-001 Latifa: 12 weeks, started 87 days ago, ended 3 days ago. All reports reviewed, one late.
  const latifaComments = [
    "Clear first report. Good that you mapped each version of the flow.",
    "Good interview work. Keep linking each finding to a design question.",
    "Strong testing. Note how you measured the booking time.",
    "Good accessibility work. Tell me early next time a deadline clashes.",
    "Clear, calm messages. Well explained.",
    "A strong finish. Well done on the presentation.",
  ];
  const latifaDays: [number, number][] = [[-74, -72], [-60, -58], [-46, -44], [-29, -27], [-18, -16], [-4, -2]];
  latifaDays.forEach(([sub, rev], i) => {
    submit(latifa, i + 1, sub, LATIFA[i]!);
    review(latifa, i + 1, rev, latifaComments[i]!);
  });
  complete(meeting(latifa, -75, 11, "Faculty invitation", "Agree learning goals and how you will report progress.", -79),
    "Agreed goals around user research, prototyping and accessibility. Latifa is settling in well.");
  complete(meeting(latifa, -45, 10, "Student request", "Review my interview findings and the feedback from the designer.", -50),
    "Discussed the affinity map and the first prototype. Good progress; keep write-ups short.");
  complete(meeting(latifa, -12, 15, "Student request", "Prepare for the final presentation and the end of the internship.", -16),
    "Practised the presentation. Latifa is ready to present and has a handover plan.");
  hr(latifa, -70, "On track", "Latifa is a reliable member of the team and asks good questions.",
    "Careful with patient privacy and very organised in interviews.", "Keep written summaries shorter.");
  hr(latifa, -40, "On track", "The team now uses Latifa's booking prototype in planning meetings.",
    "Builds clear prototypes that answer the team's questions.", "Practise presenting design choices to managers.");
  hr(latifa, -5, "On track", "Latifa finished strongly and presented to the clinic managers with confidence. We would be happy to host her again.",
    "Clear presentation and very good handover notes.", "");

  // PLC-002 Rashed: 16 weeks, started 50 days ago. One late report, Report 3 waiting for review,
  // Month 2 meeting booked in 4 days, supervisor has some concerns.
  submit(rashed, 1, -37, RASHED[0]!);
  review(rashed, 1, -35, "Good start, add more detail on what you learned.");
  submit(rashed, 2, -20, RASHED[1]!);
  review(rashed, 2, -18, "Useful evaluation work. Please submit on time next time, or tell me early if a deadline is at risk.");
  submit(rashed, 3, -9, RASHED[2]!);
  complete(meeting(rashed, -40, 10, "Student request", "Discuss my first two weeks and agree my learning goals.", -44),
    "Reviewed onboarding and the data cleaning script. Agreed learning goals: model evaluation, deployment basics and clear reporting.");
  meeting(rashed, 4, 13, "Student request", "Review my model results and plan the API service.", -2);
  hr(rashed, -36, "On track", "Rashed has settled in well. His data cleaning script was reviewed and merged in his second week.",
    "Picks up new tools quickly and documents his work well.", "Ask for help earlier instead of staying stuck on one problem.");
  hr(rashed, -12, "Some concerns", "Rashed's technical work is good, but his time management slipped this month. I have asked him to share a weekly plan with me.",
    "His evaluation script is clear and the team already uses it.", "Missed two daily stand-ups and was late with one task. He needs to plan his week better.");

  // PLC-003 Aisha: 24 weeks, started 66 days ago. Report 2 waits for changes, Report 3 overdue,
  // Report 4 late, Month 2 meeting missed, supervisor has serious concerns.
  submit(aisha, 1, -53, AISHA[0]!);
  review(aisha, 1, -51, "Good start. Keep a note of every gap you fill in the data.");
  submit(aisha, 2, -38, AISHA[1]!);
  changes(aisha, 2, -36, "Please add the conversion numbers you mention and explain what you will change in the model.");
  submit(aisha, 4, -7, AISHA[3]!);
  complete(meeting(aisha, -55, 10, "Student request", "Discuss onboarding and my analysis plan.", -58),
    "Talked through the first dashboard and the data gaps. Agreed to move the cleaning into SQL.");
  missed(meeting(aisha, -20, 15, "Faculty invitation", "Check progress on the conversion model and the Report 2 changes.", -25));
  hr(aisha, -45, "Some concerns", "Aisha is keen to learn, but she often needs reminders to update the conversion model.",
    "Good with SQL and quick to start using Power BI.", "Often arrives late and needs reminders to finish tasks.");
  hr(aisha, -15, "Serious concerns", "Aisha can do good analysis, but her reliability has been a problem in the last weeks. I would like to discuss this with her faculty advisor.",
    "The price band analysis was useful to the sales team.", "Missed deadlines on the conversion model and did not reply to two messages. Needs close supervision.");

  // Faculty availability: the next 10 working days (Mon–Fri) at 10:00 and 15:00, 30 minutes each, skipping clashes.
  let added = 0;
  for (let off = 1; added < 10 && off < 30; off++) {
    const wd = new Date(Date.parse(at(now, off, 12)) + 4 * 3_600_000).getUTCDay();
    if (wd === 0 || wd === 6) continue;
    added++;
    for (const h of [10, 15]) {
      const st = at(now, off, h);
      const en = addMins(st, 30);
      const clash =
        s.slots.some((x) => overlaps(st, en, x.start, x.end)) ||
        s.meetings.some((m) => OPEN_MEETING.includes(m.status) && overlaps(st, en, m.start, m.end));
      if (!clash) newSlot(st);
    }
  }
  return s;
}
