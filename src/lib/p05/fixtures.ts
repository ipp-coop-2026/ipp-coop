/**
 * P05 demo slice: 6 synthetic students (COOP-B001..B006) and 6 listings (OP-026..OP-031) with the eight planted
 * data problems D1-D8, plus precomputed gte-small scores. Identical to the same records in the shared database.
 * Used when the shared database cannot be reached, and by the tests. Generated from Team 5's prototype
 * (src/data.js and src/ai-signals.js); do not edit by hand.
 */
import type { MatchData } from "./types";

export const DEMO_DATA: MatchData = {
  "vocabulary": [
    {
      "skill_id": "SK-SQL-01",
      "label": "SQL querying",
      "synonyms": [
        "sql",
        "database queries",
        "postgres",
        "mysql"
      ]
    },
    {
      "skill_id": "SK-PY-01",
      "label": "Python for data analysis",
      "synonyms": [
        "python",
        "pandas",
        "numpy",
        "jupyter"
      ]
    },
    {
      "skill_id": "SK-PBI-01",
      "label": "Power BI dashboards",
      "synonyms": [
        "power bi",
        "dax",
        "bi dashboards"
      ]
    },
    {
      "skill_id": "SK-TAB-01",
      "label": "Tableau",
      "synonyms": [
        "tableau",
        "data visualisation"
      ]
    },
    {
      "skill_id": "SK-XLS-01",
      "label": "Advanced Excel",
      "synonyms": [
        "excel",
        "spreadsheets",
        "pivot tables"
      ]
    },
    {
      "skill_id": "SK-STAT-01",
      "label": "Applied statistics",
      "synonyms": [
        "statistics",
        "regression",
        "hypothesis testing"
      ]
    },
    {
      "skill_id": "SK-JIRA-01",
      "label": "Jira work-item management",
      "synonyms": [
        "jira",
        "agile board",
        "sprint board",
        "scrum board",
        "tickets",
        "issue tracking"
      ]
    },
    {
      "skill_id": "SK-AGL-01",
      "label": "Agile and Scrum practice",
      "synonyms": [
        "agile",
        "scrum",
        "kanban",
        "sprint ceremonies",
        "board"
      ]
    },
    {
      "skill_id": "SK-ML-01",
      "label": "Machine learning fundamentals",
      "synonyms": [
        "machine learning",
        "scikit-learn",
        "classification models"
      ]
    },
    {
      "skill_id": "SK-AVN-01",
      "label": "Aviation operations domain",
      "synonyms": [
        "aviation",
        "airline",
        "airport",
        "flight operations"
      ]
    },
    {
      "skill_id": "SK-SCM-01",
      "label": "Supply-chain analytics",
      "synonyms": [
        "supply chain",
        "logistics",
        "inventory",
        "freight"
      ]
    },
    {
      "skill_id": "SK-GIS-01",
      "label": "GIS and spatial analysis",
      "synonyms": [
        "gis",
        "maps",
        "spatial analysis",
        "qgis"
      ]
    },
    {
      "skill_id": "SK-ARB-01",
      "label": "Professional Arabic",
      "synonyms": [
        "arabic"
      ]
    },
    {
      "skill_id": "SK-COM-01",
      "label": "Stakeholder communication",
      "synonyms": [
        "presentation",
        "communication",
        "reporting"
      ]
    }
  ],
  "profiles": [
    {
      "student_id": "COOP-B001",
      "name": "Layla Hassan",
      "profile_version": 2,
      "published_at": "2026-10-02",
      "change_note": "First submitted profile",
      "goals": "Learn how airline operations data drives on-time performance.",
      "sectors": [
        "aviation"
      ],
      "roles": [
        "data analyst"
      ],
      "locations": [
        "Dubai"
      ],
      "work_arrangements": [
        "on-site",
        "hybrid"
      ],
      "availability": {
        "start": "2027-01-15",
        "end": "2027-06-30"
      },
      "skills": [
        {
          "skill_id": "SK-SQL-01",
          "source": "reviewed",
          "evidence_id": "E-SQL-07",
          "review_date": "2026-10-12"
        },
        {
          "skill_id": "SK-PY-01",
          "source": "self_declared",
          "evidence_id": null,
          "review_date": null
        }
      ],
      "unmapped_skills": []
    },
    {
      "student_id": "COOP-B001",
      "name": "Layla Hassan",
      "profile_version": 3,
      "published_at": "2026-10-21",
      "change_note": "Added Jira and Power BI (self-declared); Python reviewed by P06",
      "goals": "Learn how airline operations data drives on-time performance and build aviation analytics dashboards in Dubai.",
      "sectors": [
        "aviation",
        "logistics"
      ],
      "roles": [
        "data analyst",
        "operations analyst"
      ],
      "locations": [
        "Dubai"
      ],
      "work_arrangements": [
        "on-site",
        "hybrid"
      ],
      "availability": {
        "start": "2027-01-15",
        "end": "2027-06-30"
      },
      "skills": [
        {
          "skill_id": "SK-SQL-01",
          "source": "reviewed",
          "evidence_id": "E-SQL-07",
          "review_date": "2026-10-12"
        },
        {
          "skill_id": "SK-PY-01",
          "source": "reviewed",
          "evidence_id": "E-PY-02",
          "review_date": "2026-10-15"
        },
        {
          "skill_id": "SK-PBI-01",
          "source": "self_declared",
          "evidence_id": null,
          "review_date": null
        },
        {
          "skill_id": "SK-JIRA-01",
          "source": "self_declared",
          "evidence_id": null,
          "review_date": null
        },
        {
          "skill_id": "SK-COM-01",
          "source": "self_declared",
          "evidence_id": null,
          "review_date": null
        }
      ],
      "unmapped_skills": []
    },
    {
      "student_id": "COOP-B002",
      "name": "Omar Al-Farsi",
      "profile_version": 2,
      "published_at": "2026-10-18",
      "change_note": "Availability end date left blank",
      "goals": "Use data to make freight and airport logistics more reliable.",
      "sectors": [
        "logistics",
        "aviation"
      ],
      "roles": [
        "data analyst"
      ],
      "locations": [
        "Abu Dhabi",
        "Dubai"
      ],
      "work_arrangements": [
        "on-site",
        "hybrid"
      ],
      "availability": {
        "start": "2027-01-20",
        "end": null
      },
      "skills": [
        {
          "skill_id": "SK-SQL-01",
          "source": "reviewed",
          "evidence_id": "E-SQL-11",
          "review_date": "2026-10-09"
        },
        {
          "skill_id": "SK-PY-01",
          "source": "reviewed",
          "evidence_id": "E-PY-05",
          "review_date": "2026-10-11"
        },
        {
          "skill_id": "SK-XLS-01",
          "source": "self_declared",
          "evidence_id": null,
          "review_date": null
        },
        {
          "skill_id": "SK-SCM-01",
          "source": "reviewed",
          "evidence_id": "E-SCM-01",
          "review_date": "2026-10-14"
        }
      ],
      "unmapped_skills": []
    },
    {
      "student_id": "COOP-B003",
      "name": "Mariam Al-Suwaidi",
      "profile_version": 1,
      "published_at": "2026-10-20",
      "change_note": "First submitted profile",
      "goals": "Work on airline network and scheduling analysis.",
      "sectors": [
        "aviation"
      ],
      "roles": [
        "data analyst"
      ],
      "locations": [
        "Dubai"
      ],
      "work_arrangements": [
        "on-site",
        "hybrid"
      ],
      "availability": {
        "start": "2027-01-10",
        "end": "2027-06-15"
      },
      "skills": [
        {
          "skill_id": "SK-SQL-01",
          "source": "reviewed",
          "evidence_id": "E-SQL-14",
          "review_date": "2026-10-16"
        },
        {
          "skill_id": "SK-PY-01",
          "source": "reviewed",
          "evidence_id": "E-PY-08",
          "review_date": "2026-10-16"
        },
        {
          "skill_id": "SK-JIRA-01",
          "source": "self_declared",
          "evidence_id": null,
          "review_date": null
        },
        {
          "skill_id": "SK-AVN-01",
          "source": "self_declared",
          "evidence_id": null,
          "review_date": null
        }
      ],
      "unmapped_skills": []
    },
    {
      "student_id": "COOP-B004",
      "name": "Arjun Mehta",
      "profile_version": 2,
      "published_at": "2026-10-22",
      "change_note": "Added free-text skill",
      "goals": "Apply machine learning to public-sector open data and city services.",
      "sectors": [
        "public sector",
        "technology"
      ],
      "roles": [
        "data scientist",
        "data analyst"
      ],
      "locations": [
        "Abu Dhabi",
        "Remote"
      ],
      "work_arrangements": [
        "hybrid",
        "remote"
      ],
      "availability": {
        "start": "2027-01-05",
        "end": "2027-05-31"
      },
      "skills": [
        {
          "skill_id": "SK-PY-01",
          "source": "reviewed",
          "evidence_id": "E-PY-09",
          "review_date": "2026-10-13"
        },
        {
          "skill_id": "SK-ML-01",
          "source": "reviewed",
          "evidence_id": "E-ML-02",
          "review_date": "2026-10-17"
        },
        {
          "skill_id": "SK-STAT-01",
          "source": "reviewed",
          "evidence_id": "E-STAT-04",
          "review_date": "2026-10-17"
        },
        {
          "skill_id": "SK-GIS-01",
          "source": "self_declared",
          "evidence_id": null,
          "review_date": null
        }
      ],
      "unmapped_skills": [
        "agile board hygiene"
      ]
    },
    {
      "student_id": "COOP-B005",
      "name": "Noura Al-Hammadi",
      "profile_version": 3,
      "published_at": "2026-10-08",
      "change_note": "First submitted profile",
      "goals": "Build BI dashboards that help hospital and airport operations teams plan capacity.",
      "sectors": [
        "healthcare",
        "aviation"
      ],
      "roles": [
        "BI developer",
        "data analyst"
      ],
      "locations": [
        "Abu Dhabi",
        "Dubai"
      ],
      "work_arrangements": [
        "hybrid",
        "on-site"
      ],
      "availability": {
        "start": "2027-01-10",
        "end": "2027-04-30"
      },
      "skills": [
        {
          "skill_id": "SK-PBI-01",
          "source": "reviewed",
          "evidence_id": "E-PBI-03",
          "review_date": "2026-10-05"
        },
        {
          "skill_id": "SK-SQL-01",
          "source": "reviewed",
          "evidence_id": "E-SQL-15",
          "review_date": "2026-10-05"
        },
        {
          "skill_id": "SK-XLS-01",
          "source": "reviewed",
          "evidence_id": "E-XLS-06",
          "review_date": "2026-10-06"
        },
        {
          "skill_id": "SK-TAB-01",
          "source": "self_declared",
          "evidence_id": null,
          "review_date": null
        }
      ],
      "unmapped_skills": []
    },
    {
      "student_id": "COOP-B005",
      "name": "Noura Al-Hammadi",
      "profile_version": 4,
      "published_at": "2026-11-02",
      "change_note": "Extended availability end date to 2027-06-30",
      "goals": "Build BI dashboards that help hospital and airport operations teams plan capacity.",
      "sectors": [
        "healthcare",
        "aviation"
      ],
      "roles": [
        "BI developer",
        "data analyst"
      ],
      "locations": [
        "Abu Dhabi",
        "Dubai"
      ],
      "work_arrangements": [
        "hybrid",
        "on-site"
      ],
      "availability": {
        "start": "2027-01-10",
        "end": "2027-06-30"
      },
      "skills": [
        {
          "skill_id": "SK-PBI-01",
          "source": "reviewed",
          "evidence_id": "E-PBI-03",
          "review_date": "2026-10-05"
        },
        {
          "skill_id": "SK-SQL-01",
          "source": "reviewed",
          "evidence_id": "E-SQL-15",
          "review_date": "2026-10-05"
        },
        {
          "skill_id": "SK-XLS-01",
          "source": "reviewed",
          "evidence_id": "E-XLS-06",
          "review_date": "2026-10-06"
        },
        {
          "skill_id": "SK-TAB-01",
          "source": "self_declared",
          "evidence_id": null,
          "review_date": null
        }
      ],
      "unmapped_skills": []
    },
    {
      "student_id": "COOP-B006",
      "name": "Daniel Okafor",
      "profile_version": 1,
      "published_at": "2026-10-25",
      "change_note": "First submitted profile",
      "goals": "Remote analytics work on airline customer and route data.",
      "sectors": [
        "aviation"
      ],
      "roles": [
        "data analyst",
        "operations analyst"
      ],
      "locations": [
        "Remote"
      ],
      "work_arrangements": [
        "remote"
      ],
      "availability": {
        "start": "2027-01-15",
        "end": "2027-06-30"
      },
      "skills": [
        {
          "skill_id": "SK-XLS-01",
          "source": "reviewed",
          "evidence_id": "E-XLS-09",
          "review_date": "2026-10-19"
        },
        {
          "skill_id": "SK-PBI-01",
          "source": "reviewed",
          "evidence_id": "E-PBI-07",
          "review_date": "2026-10-19"
        },
        {
          "skill_id": "SK-AVN-01",
          "source": "self_declared",
          "evidence_id": null,
          "review_date": null
        },
        {
          "skill_id": "SK-SQL-01",
          "source": "self_declared",
          "evidence_id": null,
          "review_date": null
        }
      ],
      "unmapped_skills": []
    }
  ],
  "listings": [
    {
      "opportunity_id": "OP-026",
      "approved_version": 1,
      "listing_status": "open",
      "closed_on": null,
      "versions": {
        "1": {
          "title": "Airport Ground Operations Data Intern",
          "employer": "Gulf Airside Services",
          "city": "Dubai",
          "work_arrangement": "on-site",
          "start_date": "2027-02-01",
          "end_date": "2027-05-15",
          "sector": "aviation",
          "role_family": "operations analyst",
          "description": "Analyse turnaround and ground-handling data to find the causes of departure delays at a busy airport.",
          "mandatory": [
            {
              "kind": "arrangement",
              "arrangements": [
                "on-site"
              ],
              "city": "Dubai"
            },
            {
              "kind": "availability"
            },
            {
              "kind": "skill",
              "skill_id": "SK-XLS-01"
            }
          ],
          "desirable": [
            {
              "kind": "skill",
              "skill_id": "SK-PBI-01"
            },
            {
              "kind": "skill",
              "skill_id": "SK-AVN-01"
            }
          ]
        }
      }
    },
    {
      "opportunity_id": "OP-027",
      "approved_version": 1,
      "listing_status": "open",
      "closed_on": null,
      "versions": {
        "1": {
          "title": "Logistics Network Analytics Intern",
          "employer": "Falcon Freight Logistics",
          "city": "Abu Dhabi",
          "work_arrangement": "hybrid",
          "start_date": "2027-02-15",
          "end_date": "2027-06-15",
          "sector": "logistics",
          "role_family": "data analyst",
          "description": "Model freight flows between the port and inland hubs and report on network bottlenecks.",
          "mandatory": [
            {
              "kind": "skill",
              "skill_id": "SK-SQL-01"
            },
            {
              "kind": "skill",
              "skill_id": "SK-PY-01"
            },
            {
              "kind": "availability"
            }
          ],
          "desirable": [
            {
              "kind": "skill",
              "skill_id": "SK-JIRA-01"
            },
            {
              "kind": "skill",
              "skill_id": "SK-SCM-01"
            },
            {
              "kind": "skill",
              "skill_id": "SK-TAB-01"
            }
          ]
        }
      }
    },
    {
      "opportunity_id": "OP-028",
      "approved_version": 2,
      "listing_status": "open",
      "closed_on": null,
      "versions": {
        "2": {
          "title": "Aviation Analytics Intern",
          "employer": "Emirates Group",
          "city": "Dubai",
          "work_arrangement": "hybrid",
          "start_date": "2027-02-01",
          "end_date": "2027-05-31",
          "sector": "aviation",
          "role_family": "data analyst",
          "description": "Build on-time performance dashboards from flight operations data and track analytics work items in Jira.",
          "mandatory": [
            {
              "kind": "skill",
              "skill_id": "SK-SQL-01"
            },
            {
              "kind": "skill",
              "skill_id": "SK-JIRA-01"
            },
            {
              "kind": "availability"
            },
            {
              "kind": "arrangement",
              "arrangements": [
                "hybrid",
                "on-site"
              ],
              "city": "Dubai"
            }
          ],
          "desirable": [
            {
              "kind": "skill",
              "skill_id": "SK-PBI-01"
            },
            {
              "kind": "skill",
              "skill_id": "SK-PY-01"
            },
            {
              "kind": "skill",
              "skill_id": "SK-AVN-01"
            }
          ]
        }
      }
    },
    {
      "opportunity_id": "OP-029",
      "approved_version": 1,
      "listing_status": "open",
      "closed_on": null,
      "versions": {
        "1": {
          "title": "Open Data Fellow",
          "employer": "Oasis Civic Data Lab",
          "city": "Remote",
          "work_arrangement": "remote",
          "start_date": "2027-01-15",
          "end_date": "2027-04-30",
          "sector": "public sector",
          "role_family": "data analyst",
          "description": "Clean and publish open city-services datasets and write short analysis notes for residents.",
          "mandatory": [],
          "desirable": [
            {
              "kind": "skill",
              "skill_id": "SK-PY-01"
            },
            {
              "kind": "skill",
              "skill_id": "SK-STAT-01"
            },
            {
              "kind": "skill",
              "skill_id": "SK-GIS-01"
            }
          ]
        }
      }
    },
    {
      "opportunity_id": "OP-030",
      "approved_version": 1,
      "listing_status": "closed",
      "closed_on": "2026-11-01",
      "versions": {
        "1": {
          "title": "Airline Revenue Analytics Intern",
          "employer": "Skyline Carriers",
          "city": "Dubai",
          "work_arrangement": "on-site",
          "start_date": "2027-01-15",
          "end_date": "2027-05-15",
          "sector": "aviation",
          "role_family": "data analyst",
          "description": "Support fare and revenue analysis for regional routes.",
          "mandatory": [
            {
              "kind": "skill",
              "skill_id": "SK-SQL-01"
            },
            {
              "kind": "availability"
            }
          ],
          "desirable": [
            {
              "kind": "skill",
              "skill_id": "SK-PY-01"
            }
          ]
        }
      }
    },
    {
      "opportunity_id": "OP-031",
      "approved_version": 2,
      "listing_status": "open",
      "closed_on": null,
      "versions": {
        "1": {
          "title": "Hospital Operations BI Intern",
          "employer": "Al Noor Health Partners",
          "city": "Abu Dhabi",
          "work_arrangement": "hybrid",
          "start_date": "2027-02-01",
          "end_date": "2027-05-31",
          "sector": "healthcare",
          "role_family": "BI developer",
          "description": "Superseded draft. Required Tableau.",
          "mandatory": [
            {
              "kind": "skill",
              "skill_id": "SK-TAB-01"
            },
            {
              "kind": "availability"
            }
          ],
          "desirable": [
            {
              "kind": "skill",
              "skill_id": "SK-XLS-01"
            }
          ]
        },
        "2": {
          "title": "Hospital Operations BI Intern",
          "employer": "Al Noor Health Partners",
          "city": "Abu Dhabi",
          "work_arrangement": "hybrid",
          "start_date": "2027-02-01",
          "end_date": "2027-05-31",
          "sector": "healthcare",
          "role_family": "BI developer",
          "description": "Build bed-capacity and clinic-wait dashboards for hospital operations planners.",
          "mandatory": [
            {
              "kind": "skill",
              "skill_id": "SK-PBI-01"
            },
            {
              "kind": "skill",
              "skill_id": "SK-SQL-01"
            },
            {
              "kind": "availability"
            }
          ],
          "desirable": [
            {
              "kind": "skill",
              "skill_id": "SK-XLS-01"
            },
            {
              "kind": "skill",
              "skill_id": "SK-STAT-01"
            }
          ]
        }
      }
    }
  ],
  "evidence": [
    {
      "evidence_id": "E-SQL-07",
      "student_id": "COOP-B001",
      "skill_id": "SK-SQL-01",
      "activity": "SQL practice set: flight delays",
      "outcome": "demonstrated",
      "reviewer": "P06 reviewer (synthetic)",
      "review_date": "2026-10-12"
    },
    {
      "evidence_id": "E-PY-02",
      "student_id": "COOP-B001",
      "skill_id": "SK-PY-01",
      "activity": "pandas notebook: on-time performance",
      "outcome": "demonstrated",
      "reviewer": "P06 reviewer (synthetic)",
      "review_date": "2026-10-15"
    },
    {
      "evidence_id": "E-PBI-03",
      "student_id": "COOP-B005",
      "skill_id": "SK-PBI-01",
      "activity": "Power BI capacity dashboard",
      "outcome": "demonstrated",
      "reviewer": "P06 reviewer (synthetic)",
      "review_date": "2026-10-05"
    }
  ],
  "ai": {
    "model": "Supabase/gte-small",
    "source": "precomputed",
    "goals": {
      "78B4D3E7": {
        "OP-026@1": 0.8823,
        "OP-027@1": 0.8247,
        "OP-028@2": 0.8837,
        "OP-029@1": 0.7986,
        "OP-030@1": 0.8749,
        "OP-031@1": 0.7889,
        "OP-031@2": 0.8078
      },
      "3EBC2B8E": {
        "OP-026@1": 0.8924,
        "OP-027@1": 0.8395,
        "OP-028@2": 0.9117,
        "OP-029@1": 0.8079,
        "OP-030@1": 0.8848,
        "OP-031@1": 0.7957,
        "OP-031@2": 0.828
      },
      "F6E1B660": {
        "OP-026@1": 0.878,
        "OP-027@1": 0.8705,
        "OP-028@2": 0.8393,
        "OP-029@1": 0.8214,
        "OP-030@1": 0.8476,
        "OP-031@1": 0.7856,
        "OP-031@2": 0.8015
      },
      "DA7A6782": {
        "OP-026@1": 0.8949,
        "OP-027@1": 0.872,
        "OP-028@2": 0.902,
        "OP-029@1": 0.8157,
        "OP-030@1": 0.9178,
        "OP-031@1": 0.8237,
        "OP-031@2": 0.8353
      },
      "66C2A2CF": {
        "OP-026@1": 0.8277,
        "OP-027@1": 0.8185,
        "OP-028@2": 0.8081,
        "OP-029@1": 0.9054,
        "OP-030@1": 0.8157,
        "OP-031@1": 0.7864,
        "OP-031@2": 0.7956
      },
      "5A8D515E": {
        "OP-026@1": 0.8524,
        "OP-027@1": 0.8481,
        "OP-028@2": 0.8615,
        "OP-029@1": 0.8047,
        "OP-030@1": 0.8528,
        "OP-031@1": 0.8874,
        "OP-031@2": 0.9329
      },
      "9585C8FF": {
        "OP-026@1": 0.8876,
        "OP-027@1": 0.8511,
        "OP-028@2": 0.8936,
        "OP-029@1": 0.8108,
        "OP-030@1": 0.9084,
        "OP-031@1": 0.805,
        "OP-031@2": 0.816
      }
    },
    "phrases": {
      "agile board hygiene": [
        {
          "skill_id": "SK-AGL-01",
          "score": 0.8783
        },
        {
          "skill_id": "SK-JIRA-01",
          "score": 0.8583
        },
        {
          "skill_id": "SK-SEC-01",
          "score": 0.8248
        }
      ]
    }
  }
};
