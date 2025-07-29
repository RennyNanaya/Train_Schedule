let jobData = [];

function loadJobData() {
const eventsContainer = document.getElementById("events");
const upcomingContainer = document.getElementById("upcoming");
const lastWeekContainer = document.getElementById("last-week-summary"); // If you use one
  
 fetch("schedule.json")
    .then(res => {
      if (!res.ok) throw new Error("Primary fetch failed");
      return res.json();
    })
    .catch(() => {
      console.warn("Primary fetch failed. Trying fallback...");
      return fetch("").then(res => {
        if (!res.ok) throw new Error("Fallback fetch failed");
        return res.json();
      });
    })

    .then(data => {
      jobData = data.sort((a, b) => {
        const dA = parseJobDate(a.date);
        const dB = parseJobDate(b.date);
        return (!dA ? 1 : !dB ? -1 : dB - dA);
      });

      const nextWeekRange = getWeekRange(new Date(), 1);
      const scheduledJobs = jobData.filter(isScheduled);
      //const upcomingJobs = jobData.filter(job => isUpcoming(job, nextWeekRange.end));


const upcomingJobs = jobData.filter(job => {
  const d = parseJobDate(job.date);
  return !d || d > nextWeekRange.end;
});

console.log("nextWeekRange:", nextWeekRange.start.toDateString(), "→", nextWeekRange.end.toDateString());
console.log(upcomingJobs);
if (eventsContainer) eventsContainer.innerHTML = "";
  if (upcomingContainer) upcomingContainer.innerHTML = "";
      renderScheduledWeeks(scheduledJobs);
rotateOverflowEntries(); // 👈 New sparkle added here
      renderJobList("upcoming", upcomingJobs);
      renderLastWeekSummary(jobData);
    });
}

// Initial load
loadJobData();

// 🔄 Refresh every 10 minutes (600,000 ms)
setInterval(loadJobData, 600000);
  
function getSunday(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekRange(baseDate, offset) {
  const start = new Date(getSunday(baseDate));
  start.setDate(start.getDate() + offset * 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end };
}

function parseJobDate(str) {
  const parts = str?.includes("/") ? str.split("/") : str?.split("-");
  if (!parts || parts.length !== 3) return null;

  let month, day, year;
  if (str.includes("/")) {
    [month, day, year] = parts;
  } else {
    [year, month, day] = parts;
  }

  return new Date(+year, +month - 1, +day);
}

function isScheduled(job) {
  return !!job.date?.trim();
}
function isUpcoming(job, nextWeekEnd) {
  const d = parseJobDate(job.date);
  return !job.date || d > nextWeekEnd;
}

function isWithinRange(job, start, end) {
  const d = parseJobDate(job.date);
  return d && d >= start && d <= end;
}

function formatDate(dateObj) {
  if (!(dateObj instanceof Date) || isNaN(dateObj)) return "--";

  return dateObj.toISOString().split("T")[0];
}

function renderLastWeekSummary(jobData) {
  const lastWeekList = document.getElementById("last-week-list");
  const summaryContainer = document.getElementById("last-week-summary");
  

    if (!(lastWeekList && summaryContainer)) return;

  // 🧹 Clear out the old list before rendering new items
  lastWeekList.innerHTML = "";


  const thisWeekRange = getWeekRange(new Date(), 0);
  const oneWeekAgoStart = new Date(thisWeekRange.start);
  oneWeekAgoStart.setDate(oneWeekAgoStart.getDate() - 7);
  const oneWeekAgoEnd = new Date(thisWeekRange.start);

  const lastWeekEvents = jobData.filter(evt => {
    if (!evt.date) return false;

    const d = parseJobDate(evt.date)

    return d >= oneWeekAgoStart && d < oneWeekAgoEnd;
  });

  if (lastWeekEvents.length > 0) {
    lastWeekEvents.forEach(evt => {
      const li = document.createElement("li");
      li.textContent = `${formatDate(new Date(evt.date))}: ${evt.job} (${evt.client}, ${evt.location}) - ${evt.assigned}`;
      lastWeekList.appendChild(li);
    });
    summaryContainer.style.display = "block";
  } else {
    lastWeekList.innerHTML = "<li>No jobs last week</li>";
  }
}

function renderScheduledWeeks(jobs) {
  const today = new Date();
  const lastWeekDate = new Date();
  lastWeekDate.setDate(today.getDate() - 7);

  const weeks = [
    { label: `Shipping Week ${getCGCShippingWeek(today)}`, offset: 0 },
    { label: `Shipping Week ${getCGCShippingWeek(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7))}`, offset: 1 },
  ];

  weeks.forEach(({ label, offset }) => {
    const range = getWeekRange(today, offset);
    const weekEvents = jobs.filter(job => {
  if (!job.date || job.date.trim() === "") return false;

  const parts = job.date.split("/").map(str => str.trim());
  if (parts.length !== 3) return false;

  const [month, day, year] = parts;
  const parsed = new Date(+year, +month - 1, +day);

  // Only include if parsed is valid and within range
  return !isNaN(parsed) && parsed >= range.start && parsed <= range.end;
});
console.log("Week:", label, "Jobs:", weekEvents.length);

    renderWeekGrid(label, range, weekEvents);


  });
}

function rotateOverflowEntries() {
  document.querySelectorAll(".day-cell").forEach(cell => {
    const entries = Array.from(cell.querySelectorAll(".entry-box"));

    if (entries.length <= 3) {
      entries.forEach(e => e.classList.add("visible"));
      return;
    }

    let visibleIndex = 0;

    setInterval(() => {
      entries.forEach(e => e.classList.remove("visible"));

      for (let i = 0; i < 3; i++) {
        const idx = (visibleIndex + i) % entries.length;
        entries[idx].classList.add("visible");
      }

      visibleIndex = (visibleIndex + 3) % entries.length;
    }, 4000);
  });
}
function renderJobList(containerId, jobs, fallbackMessage = "No jobs found") {

  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = "";

  if (jobs.length === 0) {
    container.innerHTML = `<p>${fallbackMessage}</p>`;
    return;
  }

  const list = document.createElement("ul");
  list.className = "upcoming-list";

  jobs.forEach(job => {
    const li = document.createElement("li");
    li.className = "upcoming-item";

    const dateStr = job.date && job.date.trim() !== ""
      ? formatDate(new Date(job.date))
      : "🕓 TBD";

    li.innerHTML = `
      <strong>${job.job} - (${job.client} ${job.location})</strong>${dateStr} <br> ${job.CarNo} ${job.Commodity} 
    `;

    list.appendChild(li);
  });

  container.appendChild(list);
}

const thisWeekRange = getWeekRange(new Date(), 0); // Current week

function renderWeekGrid(label, range, events) {
  const container = document.getElementById("events");

  // Create wrapper section for one full week
  const weekSection = document.createElement("div");
  weekSection.className = "week-section";

  // Create and add the heading
  const heading = document.createElement("div");
  heading.className = "week-header";
  heading.textContent = `${label} (${formatDate(range.start)} → ${formatDate(range.end)})`;
  weekSection.appendChild(heading);

  // Create grid container
  const grid = document.createElement("div");
  grid.className = "week-row";

  // Populate 7 day cells
  for (let i = 0; i < 7; i++) {
  const day = new Date(range.start);
  day.setDate(day.getDate() + i);

  const cell = document.createElement("div");
  cell.className = "day-cell";

  const dayName = day.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
  cell.innerHTML = `<h3>${dayName}</h3>`;

  const dayEvents = events.filter(evt => {
    if (!evt.date) return false;
    const evtDate = parseJobDate(evt.date)
    return evtDate.toDateString() === day.toDateString(); // ✅ this should now be safe
  });

  dayEvents.forEach(evt => {
    const box = document.createElement("div");
    box.className = "entry-box";
    box.innerHTML = `
      <div class="highlight">${evt.job} - ${evt.client} ${evt.location}</div>
	  <div>${evt.CarNo} - ${evt.Commodity}</div>
	  <div>${evt.tests.map(t => t.trim()).join(", ")}</div>
      <div class="assignment">${evt.assigned}</div>

    `;
    cell.appendChild(box);
  });

  grid.appendChild(cell);
}

  // Add grid to section, then section to main container
  weekSection.appendChild(grid);
  
  container.appendChild(weekSection);
}



function getCGCShippingWeek(date = new Date()) {
  let augFirst = new Date(date.getFullYear(), 7, 1); // August 1

  if (date < augFirst) {
    augFirst.setFullYear(augFirst.getFullYear() - 1);
  }

  // First Sunday after August 1
  let shippingStart = new Date(augFirst);
  let dayOfWeek = shippingStart.getDay();
  let offset = 7 - dayOfWeek;
  shippingStart.setDate(shippingStart.getDate() + offset);

  // Calculate days difference
  const diffInDays = Math.floor((date - shippingStart) / (1000 * 60 * 60 * 24));

  let shippingWeek;
  if (diffInDays >= 0) {
    shippingWeek = Math.floor(diffInDays / 7) + 1;
  } else {
    // If it's the week before the shipping calendar starts, label it Week 52
    shippingWeek = 52;
  }

  return shippingWeek;
}

function updateCountdown() {
  const minutes = Math.floor(countdownSeconds / 60);
  const seconds = countdownSeconds % 60;
  countdownDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  countdownSeconds--;

  if (countdownSeconds < 0) {
    countdownSeconds = 600;
    loadJobData(); // Refresh your data
	countdownSeconds = 600;
countdownDisplay.classList.add("flash");
setTimeout(() => countdownDisplay.classList.remove("flash"), 800);
  }
}

// Start the timer
let countdownSeconds = 600; // 10 minutes
let countdownDisplay = document.getElementById("countdown");

updateCountdown();
setInterval(updateCountdown, 1000); // Update every second