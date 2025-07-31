// --- Class Definitions ---
class JobEntry {
  constructor(startDate, endDate, inspector, type) {
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
    this.inspector = inspector;
    this.type = type;
  }
}

class TrainJob extends JobEntry {
  constructor(jobNumber, customer, siteLocation, carCount, commodityType, testList, inspector, startDate, endDate) {
    super(startDate, endDate, inspector, "train");
    this.jobNumber = jobNumber;
    this.customer = customer;
    this.siteLocation = siteLocation;
    this.carCount = carCount;
    this.commodityType = commodityType;
    this.testList = testList;
  }
}

class SamplingJob extends JobEntry {
  constructor(customer, location, containerCount, containerType, testList, inspector, startDate, endDate) {
    super(startDate, endDate, inspector, "sampling");
    this.customer = customer;
    this.location = location;
    this.containerCount = containerCount;
    this.containerType = containerType;
    this.testList = testList;
  }
}

class NonStandardEvent extends JobEntry {
  constructor(description, startDate, endDate) {
    super(startDate, endDate, undefined, "nonStandard");
	this.assignment = assignment;
    this.description = description;
  }
}

function parseRawJobs(rawList) {
  const jobs = [];

  rawList.forEach(entry => {
    const rawJob = entry.job;
    const isValidStart = entry.startDate && entry.startDate !== "Pushed";

    const startDate = isValidStart ? new Date(entry.startDate) : null;
    const endDate = entry.endDate ? new Date(entry.endDate) : startDate || new Date();

    const inspector = entry.assigned || "Unassigned";

    if (!isNaN(parseInt(rawJob))) {
      // 🚂 Train Job
      jobs.push({
        type: "train",
        jobNumber: rawJob,
        customer: entry.client,
        siteLocation: entry.location,
        carCount: entry.CarNo,
        commodityType: entry.Commodity,
        testList: Array.isArray(entry.tests) ? entry.tests.join(", ").trim() : "",
        inspector,
        startDate: isValidStart ? entry.startDate : "⏱️TBD",
        endDate
      });

    } else if (rawJob === "SPL") {
      // 🧪 Sampling Job
      jobs.push({
        type: "sampling",
        customer: entry.client,
        location: entry.location,
        containerCount: entry.CarNo || "",
        container: entry.Container || "",
        testList: Array.isArray(entry.tests) ? entry.tests.join(", ").trim() : "",
        inspector,
        startDate,
        endDate
      });

    } else {
      // 📝 NonStandard Event
      jobs.push({
        type: "nonStandard",
        description: rawJob,
        assigned: entry.assigned,
        client: entry.client,
        startDate,
        endDate
      });
    }
  });

  return jobs;
}

async function fetchJobData() {
  try {
    const response = await fetch('/schedule.json');
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const rawJobs = await response.json();
    return parseRawJobs(rawJobs); // feed into parser
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
    return [];
  }
}

// --- DOM Ready ---
document.addEventListener("DOMContentLoaded", async () => {
  const today = new Date("2025-07-30");
  const startOfWeek = getStartOfWeek(today);
  const endOfNextWeek = addDays(startOfWeek, 13);

  const jobs = await fetchJobData(); // 🌐 Get & parse your JSON

  const { inCalendar, futureJobs } = classifyJobs(jobs, startOfWeek, endOfNextWeek);
  const { calendarDays } = organizeJobsByDate(inCalendar, startOfWeek, endOfNextWeek);

  renderCalendar(calendarDays, futureJobs);
  renderWeekTitles(startOfWeek);
  renderSidePanels(jobs, today);
});

// --- Job Filtering ---
function classifyJobs(jobs, start, end) {
  const inCalendar = [], futureJobs = [];

  jobs.forEach(job => {
    const s = new Date(job.startDate);
    const isValidStart = !isNaN(s.getTime());

    if (!isValidStart) {
      // Optionally log or categorize as "unscheduled"
      console.warn("Invalid start date for job:", job);
      return;
    }

    if (s > end) {
      futureJobs.push(job);
    } else {
      inCalendar.push(job);
    }
  });

  return { inCalendar, futureJobs };
}

// --- Organize Jobs By Day ---
function organizeJobsByDate(jobs, calendarStart, calendarEnd) {
  const calendarDays = {};

  for (let i = 0; i <= 13; i++) {
    const date = addDays(calendarStart, i);
    const key = date.toISOString().split("T")[0];
    calendarDays[key] = [];
  }

  jobs.forEach(job => {
    let current = new Date(job.startDate);
    const end = new Date(job.endDate);

    while (current <= end && current <= calendarEnd) {
  const adjusted = new Date(current);
  adjusted.setDate(adjusted.getDate() + 1); // bump forward
  const key = adjusted.toISOString().split("T")[0];

  if (calendarDays[key]) {
    calendarDays[key].push(job);
  }

  current.setDate(current.getDate() + 1);
}

  });

  return { calendarDays };
}

// --- Render Job Bubbles ---
function renderCalendar(calendarDays, futureJobs) {
  const typePriority = { train: 3, sampling: 2, nonStandard: 1 };
  const keys = Object.keys(calendarDays).slice(0, 14);
  
  

  keys.forEach((key, idx) => {
    const dayBox = document.getElementById(`day-${idx}`);
    if (!dayBox) return;
	const currentDate = new Date(key); // assuming key is a date string
const dateLabel = document.createElement("div");
dateLabel.className = "date-label";
dateLabel.textContent = currentDate.toLocaleDateString("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

dayBox.appendChild(dateLabel);


    const sorted = calendarDays[key].sort((a, b) => {
      const diff = typePriority[a.type] - typePriority[b.type];
      return diff !== 0 ? diff : new Date(a.startDate) - new Date(b.startDate);
    });
const jobCount = sorted.length;
const isCondensed = jobCount > 3;

	sorted.forEach(job => {
	  const bubble = document.createElement("div");
	  bubble.className = `job-bubble ${job.type}`;

	// Non-standard Bubbles (Red at the bottom)
	  if (job.type === "nonStandard") {
		bubble.innerHTML = `<div class="NSbubble"><strong>${job.assigned} - ${job.description} ${job.client}</strong></div>`;
		bubble.style.position = "absolute";
		bubble.style.bottom = "4px";
		bubble.style.left = "4px";
		bubble.style.right = "4px";

	  } else if (job.type === "train") {
	//Train Bubbles (Blue at the Top)	 
	if (isCondensed) {
  dayBox.classList.add("condensed-day");
}

	let text = `
	  <div class="bubbletitle number"><strong>${job.jobNumber}</strong></div><div class="bubbleassignment">${job.inspector}</div>
	  <div class="bubbletitle"><strong>${job.customer} - ${job.siteLocation}</strong></div>
	  <div class="bubblebody">${job.carCount} cars – ${job.commodityType}</div>
	`;
	if (job.testList && job.testList.trim() !== "") {  text += `<div class="bubblebody">${job.testList}</div><br>`;}
	
	bubble.innerHTML = text;
	  } else {
	//Sampling Bubbles (Green below Trains)
	bubble.innerHTML = `
	<div class="bubbleassignment">${job.inspector}</div>
		  <div class="bubbletitle"><strong>${job.customer} ${job.location}</strong></div>
		  <div class="bubblebody">${job.containerCount} – ${job.container}</div>
		  `;
	  }
	  dayBox.appendChild(bubble);
	});
});
}

// --- Week Titles ---
function renderWeekTitles(startOfWeek) {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" });

  for (let i = 0; i < 2; i++) {
    const weekStart = addDays(startOfWeek, i * 7);
    const weekEnd = addDays(weekStart, 6);
    const weekNum = getCGCShippingWeek(weekStart);
    const title = `Shipping week ${weekNum} (${formatter.format(weekStart)} → ${formatter.format(weekEnd)})`;

    const titleElem = document.getElementById(`week-title-${i}`);
    if (titleElem) {
      titleElem.textContent = title;
    }
  }
}

function renderSidePanels(jobs, referenceDate) {
  const pastTrains = document.getElementById("past-trains");
  const upcomingTrains = document.getElementById("upcoming-trains");

  const weekStart = getStartOfWeek(referenceDate);
  const weekEnd = getEndOfNextWeek(referenceDate);

  jobs.forEach(job => {
    if (job.type !== "train") return;
		console.log(job.jobNumber, " - Start:", job.startDate);
		const start = isDate(job.startDate) ? new Date(job.startDate) : null;
		console.log("Resolved:", start);
		const formattedDate = start
		  ? start.toLocaleDateString("en-US", { month: "short", day: "numeric" })
		  : "⏱️TBD";



		if (start && start < weekStart) {
		  const card = createJobCard(job, formattedDate, true);
		  pastTrains.appendChild(card);

		} else if (!start || start > weekEnd) {
		  const card = createJobCard(job, formattedDate, false);
		  upcomingTrains.appendChild(card);
		}


	});
}

// --- CGC Shipping Week Calculator ---
function getCGCShippingWeek(date = new Date()) {
  let augFirst = new Date(date.getFullYear(), 7, 1);
  if (date < augFirst) augFirst.setFullYear(augFirst.getFullYear() - 1);

  let shippingStart = new Date(augFirst);
  let offset = 7 - shippingStart.getDay();
  shippingStart.setDate(shippingStart.getDate() + offset);

  const diff = Math.floor((date - shippingStart) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? Math.floor(diff / 7) + 1 : 52;
}
// --- Utilities ---
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
function getEndOfNextWeek(date) {
  const start = getStartOfWeek(date);
  start.setDate(start.getDate() + 13); // End of next week (start + 13 days)
  start.setHours(23, 59, 59, 999); // end of day
  return start;
}
function addDays(date, num) {
  const result = new Date(date);
  result.setDate(result.getDate() + num);
  return result;
}
function isDate(value) {
  const date = new Date(value);
  return !isNaN(date.getTime());
}
function validateJob(job) {
  const start = new Date(job.startDate);
  return isValidDate(start);
}
function createJobCard(job, formattedDate, isPast) {
  const card = document.createElement("div");
  card.className = "job-card"; // For styling
const additional = isPast
  ? `<strong> - ${job.inspector}</strong> </div> ${job.carCount} Cars - ${job.commodityType}`
  : `<div>${job.carCount} Cars - ${job.commodityType}</div>`;
const fullText = `
  <div class="job-info">
    <div class=sidebarhighlight><strong>${job.jobNumber}</strong> – ${job.customer}
    ${job.siteLocation} - ${formattedDate}</div>
  ${additional}
  <div class="job-date ${isPast ? "past" : "upcoming"}"></div>
  <br>
`;
card.innerHTML = fullText;
  return card;
}
