/**
 * Team 2's Launchpad demo data, as shown on launch-path-ipp.base44.app (23 Nov 2026). All synthetic.
 * Full survey of the source site: docs/port/launchpad-v2-survey.md.
 */

export type WorkMode = "On-site" | "Hybrid" | "Remote";
export type PlacementType = "Co-op" | "Internship";
export type ListingStatus = "Pending Review" | "Approved" | "Rejected" | "Closed";
export type AppStatus = "Submitted" | "Shortlisted" | "Approved" | "Not placed" | "Rejected";

export interface Company {
  id: string;
  name: string;
  hr: string;
}

export interface Listing {
  id: string;
  companyId: string;
  title: string;
  city: string;
  type: PlacementType;
  mode: WorkMode;
  duration: string;
  minYear: number;
  deadline: string; // ISO date
  required: string[];
  preferred: string[];
  summary: string;
  description: string;
  requirements: string[];
  status: ListingStatus;
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  major: string;
  year: number;
  skills: string[];
  mode?: WorkMode;
  city?: string;
  interest?: string;
}

export interface Application {
  id: string;
  studentId: string;
  listingId: string;
  appliedAt: string;
  status: AppStatus;
}

export const COMPANIES: Company[] = [
  { id: "gulf-insight", name: "Gulf Insight Analytics", hr: "Maryam Al Hosani" },
  { id: "falcon-ai", name: "Falcon AI Labs", hr: "Omar Al Nuaimi" },
  { id: "dune-software", name: "Dune Software", hr: "Sara Haddad" },
  { id: "aldar-digital", name: "Aldar Digital Studio", hr: "Hessa Al Mazrouei" },
  { id: "noor-labs", name: "Noor Labs", hr: "Rami Khoury" },
  { id: "oasis-media", name: "Oasis Media Group", hr: "Dana Saleh" },
  { id: "green-dunes", name: "Green Dunes Energy", hr: "Faisal Al Ameri" },
  { id: "hikma-health", name: "Hikma Health Tech", hr: "Lina Mansour" },
  { id: "falcon-capital", name: "Falcon Capital Partners", hr: "Youssef Badr" },
  { id: "reem-robotics", name: "Reem Robotics", hr: "Ahmed Al Shehhi" },
  { id: "dune-talent", name: "Dune Talent Partners", hr: "Mona Fakhoury" },
];

/** The three employers the dashboard can switch between, as on the source site. */
export const EMPLOYER_SWITCH = ["gulf-insight", "falcon-ai", "dune-software"];

const L = (
  id: string,
  companyId: string,
  title: string,
  city: string,
  type: PlacementType,
  mode: WorkMode,
  duration: string,
  minYear: number,
  deadline: string,
  required: string[],
  preferred: string[],
  summary: string,
  description: string,
  requirements: string[],
  status: ListingStatus = "Approved",
): Listing => ({
  id,
  companyId,
  title,
  city,
  type,
  mode,
  duration,
  minYear,
  deadline,
  required,
  preferred,
  summary,
  description,
  requirements,
  status,
  createdAt: "2026-11-01T09:00:00Z",
});

export const LISTINGS: Listing[] = [
  L(
    "cloud-data-intern",
    "gulf-insight",
    "Cloud Data Intern",
    "Abu Dhabi",
    "Internship",
    "Remote",
    "12 weeks",
    2,
    "2027-02-28",
    ["Python", "SQL"],
    ["Git"],
    "Help move analytics pipelines to the cloud and automate data jobs.",
    "Support the data engineering team migrating reporting pipelines to a cloud warehouse. You will write Python and SQL, schedule jobs, and document data flows. Remote and flexible hours.",
    [
      "Python and SQL basics",
      "Interest in data engineering or pipelines",
      "Reliable internet for remote work",
    ],
    "Pending Review",
  ),
  L(
    "se-coop-dune",
    "dune-software",
    "Software Engineering Co-op",
    "Dubai",
    "Co-op",
    "Hybrid",
    "16 weeks",
    3,
    "2027-01-05",
    ["JavaScript", "React", "Git"],
    ["Linux"],
    "Ship real features in a React product used across the region.",
    "Join a product squad shipping features in a React and TypeScript web app. You will pick up tickets, write tests, and take part in code review and sprint rituals.",
    [
      "Comfortable with JavaScript and React",
      "Uses Git day to day",
      "Available 4 days per week, hybrid from Dubai",
    ],
  ),
  L(
    "ml-coop-falcon",
    "falcon-ai",
    "Machine Learning Co-op",
    "Abu Dhabi",
    "Co-op",
    "On-site",
    "16 weeks",
    3,
    "2027-01-10",
    ["Python", "Machine Learning"],
    ["SQL"],
    "Build and ship a machine learning feature end to end.",
    "Work with the applied ML team to take one model from data to deployment: data cleaning, training, evaluation and a small service around it.",
    ["Strong Python", "A course or project in machine learning", "On-site in Abu Dhabi"],
  ),
  L(
    "cv-intern-falcon",
    "falcon-ai",
    "Computer Vision Intern",
    "Abu Dhabi",
    "Internship",
    "Hybrid",
    "16 weeks",
    3,
    "2027-01-10",
    ["Python", "Computer Vision", "OpenCV"],
    ["PyTorch"],
    "Train and evaluate vision models for a regional logistics product.",
    "Work on the computer vision team prototyping object detection models with OpenCV and PyTorch. You will label data, run experiments, and help ship a model improvement. Strong Python and a course in vision or ML are expected.",
    [
      "Comfortable with Python and OpenCV",
      "Coursework or project in computer vision or deep learning",
      "Familiar with Git workflows",
      "Available 4 days per week, hybrid from Abu Dhabi",
    ],
  ),
  L(
    "bi-intern-gulf",
    "gulf-insight",
    "Business Intelligence Intern",
    "Abu Dhabi",
    "Internship",
    "Hybrid",
    "12 weeks",
    2,
    "2026-12-20",
    ["SQL", "Power BI"],
    ["Excel", "Communication"],
    "Build Power BI reports that help teams track their key metrics.",
    "Build and maintain Power BI dashboards for operations and finance teams. You will write SQL, model data, and present findings to stakeholders every two weeks.",
    ["SQL for reporting", "Some Power BI or Tableau", "Clear written communication"],
  ),
  L(
    "da-coop-gulf",
    "gulf-insight",
    "Data Analyst Co-op",
    "Abu Dhabi",
    "Co-op",
    "On-site",
    "16 weeks",
    3,
    "2026-12-15",
    ["Python", "SQL", "Excel"],
    ["Power BI"],
    "Turn client and market data into dashboards the leadership team actually uses.",
    "Join the analytics team to clean, analyse and visualise client and market data. You will build weekly dashboards and short written briefs for leadership.",
    ["Python or R for analysis", "SQL and Excel", "On-site in Abu Dhabi"],
  ),
  L(
    "da-coop-aldar",
    "aldar-digital",
    "Data Analyst Co-op",
    "Abu Dhabi",
    "Co-op",
    "On-site",
    "6 months",
    3,
    "2026-12-15",
    ["SQL", "Power BI"],
    ["Statistics", "Excel"],
    "Turn real estate and customer data into dashboards the leadership team actually uses.",
    "Analyse real estate and customer data, build Power BI dashboards and support pricing and sales decisions with clear, simple reports.",
    ["SQL", "Power BI or a similar tool", "Interest in real estate or customer analytics"],
  ),
  L(
    "fe-intern-noor",
    "noor-labs",
    "Frontend Developer Intern",
    "Dubai",
    "Internship",
    "On-site",
    "3 months",
    2,
    "2026-12-20",
    ["JavaScript", "React"],
    ["Git"],
    "Ship real features to a product used by 40,000 monthly users.",
    "Build UI features in a React app used by 40,000 people a month, with design reviews and pair programming.",
    ["JavaScript and React basics", "An eye for detail in UI", "On-site in Dubai"],
  ),
  L(
    "marketing-oasis",
    "oasis-media",
    "Marketing & Communications Intern",
    "Dubai",
    "Internship",
    "Hybrid",
    "4 months",
    2,
    "2026-12-20",
    ["Communication"],
    ["Excel"],
    "Plan, write and measure campaign content for regional lifestyle brands.",
    "Plan and write campaign content, schedule posts and report on results for regional lifestyle brands.",
    ["Strong written English", "Interest in marketing", "Basic spreadsheet skills"],
  ),
  L(
    "sustain-green",
    "green-dunes",
    "Sustainability Analyst Co-op",
    "Abu Dhabi",
    "Co-op",
    "On-site",
    "6 months",
    3,
    "2027-01-10",
    ["Excel"],
    ["Project Planning"],
    "Help a renewable energy developer measure and report its impact.",
    "Collect and analyse environmental and project data and help prepare the company's impact reports.",
    ["Excel", "Interest in sustainability", "On-site in Abu Dhabi"],
  ),
  L(
    "ux-hikma",
    "hikma-health",
    "UX/UI Design Intern",
    "Dubai",
    "Internship",
    "On-site",
    "3 months",
    2,
    "2026-12-20",
    ["Figma", "UX Research"],
    ["Communication"],
    "Design calmer appointment journeys for a patient-facing health app.",
    "Research and redesign appointment flows in a patient-facing health app, from interviews to Figma prototypes.",
    ["Figma", "Some user research experience", "On-site in Dubai"],
  ),
  L(
    "finance-falcon",
    "falcon-capital",
    "Finance & Audit Co-op",
    "Sharjah",
    "Co-op",
    "On-site",
    "6 months",
    3,
    "2027-01-10",
    ["Excel"],
    ["Communication"],
    "Support live valuation work for regional mid-market deals.",
    "Support valuation and audit work on live mid-market deals: models, data checks and short memos.",
    ["Strong Excel", "Accounting or finance coursework", "On-site in Sharjah"],
  ),
  L(
    "se-intern-reem",
    "reem-robotics",
    "Software Engineering Intern",
    "Abu Dhabi",
    "Internship",
    "On-site",
    "4 months",
    3,
    "2027-01-05",
    ["Python", "Git"],
    ["Linux"],
    "Write the software that keeps warehouse robots moving safely.",
    "Write and test Python services that plan and monitor warehouse robot routes.",
    ["Python", "Git", "Some Linux"],
  ),
  L(
    "hr-dune-talent",
    "dune-talent",
    "HR & Talent Intern",
    "Dubai",
    "Internship",
    "On-site",
    "3 months",
    2,
    "2026-12-20",
    ["Communication"],
    ["Project Planning"],
    "Learn end-to-end hiring inside a boutique recruitment firm.",
    "Support hiring from job post to offer: sourcing, screening calls and candidate updates.",
    ["Strong communication", "Organised", "On-site in Dubai"],
  ),
];

export const STUDENTS: Student[] = [
  {
    id: "aisha",
    name: "Aisha Al Zaabi",
    email: "aisha.alzaabi@mbzuai.ac.ae",
    major: "Computer Vision",
    year: 3,
    skills: ["Python", "OpenCV", "SQL", "Data Visualization"],
    mode: "Hybrid",
    city: "Abu Dhabi",
    interest: "Data or analytics co-op",
  },
  {
    id: "khalid",
    name: "Khalid Al Mansoori",
    email: "",
    major: "Computer Science",
    year: 4,
    skills: ["JavaScript", "React", "Git", "Python"],
    mode: "Hybrid",
    city: "Dubai",
    interest: "Software engineering",
  },
  {
    id: "noor",
    name: "Noor Al Shamsi",
    email: "",
    major: "Information Systems",
    year: 2,
    skills: ["Excel", "Power BI", "Communication", "Project Planning"],
    mode: "On-site",
    city: "Abu Dhabi",
    interest: "Business intelligence",
  },
  {
    id: "hamad",
    name: "Hamad Al Blooshi",
    email: "",
    major: "Information Systems",
    year: 4,
    skills: ["Excel", "SQL", "Power BI", "Data Visualization"],
  },
  {
    id: "latifa",
    name: "Latifa Al Suwaidi",
    email: "",
    major: "Human-Computer Interaction",
    year: 3,
    skills: ["Figma", "UX Research", "Communication"],
  },
  {
    id: "susan",
    name: "Susan Blake",
    email: "susan@mbzuai.ac.ae",
    major: "Computer Science",
    year: 3,
    skills: ["JavaScript", "React"],
  },
  {
    id: "salem",
    name: "Salem Al Ketbi",
    email: "",
    major: "Business Analytics",
    year: 3,
    skills: ["SQL", "Excel", "Python"],
  },
  {
    id: "rashed",
    name: "Rashed Al Falasi",
    email: "",
    major: "Artificial Intelligence",
    year: 4,
    skills: ["Python", "Machine Learning", "SQL"],
  },
  {
    id: "yousef",
    name: "Yousef Al Hammadi",
    email: "",
    major: "Artificial Intelligence",
    year: 3,
    skills: ["Python", "Machine Learning"],
  },
  {
    id: "shamma",
    name: "Shamma Al Kaabi",
    email: "",
    major: "Computer Science",
    year: 3,
    skills: ["JavaScript", "Git"],
  },
  {
    id: "mariam",
    name: "Mariam Al Dhaheri",
    email: "",
    major: "Computer Vision",
    year: 3,
    skills: ["Python", "OpenCV", "Computer Vision"],
  },
];

/** Demo profiles on the Opportunities page: Me (the signed-in student) plus three seeded students. */
export const DEMO_PROFILES = [
  { id: "me", label: "Me" },
  { id: "aisha", label: "Aisha (CV)" },
  { id: "khalid", label: "Khalid (CS)" },
  { id: "noor", label: "Noor (IS)" },
] as const;

const A = (
  id: string,
  studentId: string,
  listingId: string,
  day: string,
  status: AppStatus,
): Application => ({
  id,
  studentId,
  listingId,
  appliedAt: `2026-11-${day}T09:00:00Z`,
  status,
});

export const APPLICATIONS: Application[] = [
  A("app-01", "susan", "se-coop-dune", "16", "Submitted"),
  A("app-02", "latifa", "ux-hikma", "04", "Approved"),
  A("app-03", "hamad", "bi-intern-gulf", "09", "Shortlisted"),
  A("app-04", "khalid", "se-coop-dune", "11", "Not placed"),
  A("app-05", "noor", "bi-intern-gulf", "15", "Not placed"),
  A("app-06", "rashed", "ml-coop-falcon", "07", "Approved"),
  A("app-07", "yousef", "ml-coop-falcon", "08", "Submitted"),
  A("app-08", "shamma", "se-coop-dune", "13", "Submitted"),
  A("app-09", "salem", "da-coop-gulf", "10", "Shortlisted"),
  A("app-10", "mariam", "cv-intern-falcon", "12", "Submitted"),
  A("app-11", "aisha", "da-coop-gulf", "14", "Submitted"),
  A("app-12", "aisha", "fe-intern-noor", "10", "Not placed"),
  A("app-13", "aisha", "da-coop-aldar", "09", "Approved"),
];

/** The 18 standard skills. Skill inputs accept only these (Team 2's Sprint 3 corrective action). */
export const SKILLS = [
  "Python",
  "SQL",
  "Excel",
  "Power BI",
  "Statistics",
  "Data Visualization",
  "Machine Learning",
  "Computer Vision",
  "OpenCV",
  "PyTorch",
  "JavaScript",
  "React",
  "Git",
  "Linux",
  "Figma",
  "UX Research",
  "Communication",
  "Project Planning",
];

/** The approved FAQ the IPP assistant answers from. Team 2 to confirm the wording. */
export const FAQ = [
  {
    q: "How do I apply for an internship?",
    a: "Complete your profile, open a placement under Opportunities and press Apply. Your profile is shared with the company when you apply.",
  },
  {
    q: "How do I check my application status?",
    a: "Open My Applications. Each application shows its latest status: Submitted, Shortlisted, Approved or Not placed.",
  },
  {
    q: "Who approves my placement?",
    a: "The co-op coordinator approves placements after the employer's review. AI never approves placements.",
  },
  {
    q: "What are the eligibility requirements?",
    a: "Each placement shows a minimum year of study and its required skills. You can apply when you meet the minimum year and the application deadline has not passed.",
  },
  {
    q: "Can I apply to more than one opportunity?",
    a: "Yes. You can apply to several placements, but only once to each one.",
  },
];
