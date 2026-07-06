const CONGRESS_API_KEY = "PASTE_YOUR_CONGRESS_API_KEY_HERE";

const feedEl = document.getElementById("feed");
const buttons = document.querySelectorAll(".filter-btn");

let allItems = [];

async function loadDashboard() {
  feedEl.innerHTML = `<p class="loading">Loading feed...</p>`;

  try {
    const [congressBills, houseBills, senateBills, courtItems] = await Promise.all([
      getCongressBills(),
      getHouseBills(),
      getSenateBills(),
      getSupremeCourtItems()
    ]);

    allItems = [
      ...congressBills,
      ...houseBills,
      ...senateBills,
      ...courtItems
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    renderFeed("all");
  } catch (error) {
    console.error(error);
    feedEl.innerHTML = `<p class="error">Something failed while loading the feed.</p>`;
  }
}

async function getCongressBills() {
  const url = `https://api.congress.gov/v3/bill?api_key=${CONGRESS_API_KEY}&format=json&limit=8`;

  const response = await fetch(url);
  const data = await response.json();

  return data.bills.map(bill => ({
    category: "congress",
    tag: "Congress",
    title: bill.title || `${bill.type} ${bill.number}`,
    summary: bill.latestAction?.text || "No latest action available.",
    date: bill.latestAction?.actionDate || bill.updateDate,
    url: bill.url?.replace("api.congress.gov/v3", "www.congress.gov")
  }));
}

async function getHouseBills() {
  const url = `https://api.congress.gov/v3/bill?api_key=${CONGRESS_API_KEY}&format=json&limit=8`;

  const response = await fetch(url);
  const data = await response.json();

  return data.bills
    .filter(bill => bill.originChamber === "House")
    .map(bill => ({
      category: "house",
      tag: "House",
      title: bill.title || `H.R. ${bill.number}`,
      summary: bill.latestAction?.text || "No latest action available.",
      date: bill.latestAction?.actionDate || bill.updateDate,
      url: bill.url?.replace("api.congress.gov/v3", "www.congress.gov")
    }));
}

async function getSenateBills() {
  const url = `https://api.congress.gov/v3/bill?api_key=${CONGRESS_API_KEY}&format=json&limit=8`;

  const response = await fetch(url);
  const data = await response.json();

  return data.bills
    .filter(bill => bill.originChamber === "Senate")
    .map(bill => ({
      category: "senate",
      tag: "Senate",
      title: bill.title || `S. ${bill.number}`,
      summary: bill.latestAction?.text || "No latest action available.",
      date: bill.latestAction?.actionDate || bill.updateDate,
      url: bill.url?.replace("api.congress.gov/v3", "www.congress.gov")
    }));
}

async function getSupremeCourtItems() {
  // CourtListener search feed converted through rss2json.
  // This searches Supreme Court opinions.
  const rssUrl = encodeURIComponent(
    "https://www.courtlistener.com/feed/search/?q=court_id%3Ascotus&type=o&order_by=dateFiled%20desc"
  );

  const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`);
  const data = await response.json();

  if (!data.items) return [];

  return data.items.slice(0, 8).map(item => ({
    category: "court",
    tag: "Supreme Court",
    title: item.title,
    summary: stripHtml(item.description || "New Supreme Court item."),
    date: item.pubDate,
    url: item.link
  }));
}

function renderFeed(filter) {
  const items = filter === "all"
    ? allItems
    : allItems.filter(item => item.category === filter);

  if (items.length === 0) {
    feedEl.innerHTML = `<p class="loading">No items found.</p>`;
    return;
  }

  feedEl.innerHTML = items.map(item => `
    <a class="card" href="${item.url}" target="_blank" rel="noopener noreferrer">
      <div class="card-top">
        <span class="tag">${item.tag}</span>
        <span class="date">${formatDate(item.date)}</span>
      </div>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.summary)}</p>
    </a>
  `).join("");
}

function formatDate(dateValue) {
  if (!dateValue) return "Unknown date";

  return new Date(dateValue).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function stripHtml(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

buttons.forEach(button => {
  button.addEventListener("click", () => {
    buttons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");
    renderFeed(button.dataset.filter);
  });
});

loadDashboard();
